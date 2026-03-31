# Security & Operations Document: OnPoint

**Version 1.0 | March 2026**
**References:** BP.md · FP.md · IMPLEMENTATION_PLAN.md · PRD.md

---

## ⚠️ Security Is Non-Negotiable

Security rules in this document are not suggestions. Every rule marked **[REQUIRED]** must be implemented before the corresponding step is marked complete in the Implementation Plan. A substep with an unresolved security rule is an incomplete substep.

---

## Table of Contents

1. [Security Philosophy](#1-security-philosophy)
2. [Global Security Rules (Apply to Every Step)](#2-global-security-rules-apply-to-every-step)
3. [Authentication & Authorization Architecture](#3-authentication--authorization-architecture)
4. [Secrets & Credentials Management](#4-secrets--credentials-management)
5. [Input Validation & Sanitization Standards](#5-input-validation--sanitization-standards)
6. [XSS Prevention](#6-xss-prevention)
7. [Data Protection & Encryption](#7-data-protection--encryption)
8. [API & WebSocket Security](#8-api--websocket-security)
9. [Database Security Practices](#9-database-security-practices)
10. [Step-by-Step Security Rules](#10-step-by-step-security-rules)
11. [Pre-Deployment Security Checklist](#11-pre-deployment-security-checklist)

---

## 1. Security Philosophy

OnPoint's security model is built on three principles:

**1. Server is the enforcer, UI is a courtesy.**
The UI hides controls that users cannot use — this improves experience. But the server enforces permissions on every single request regardless of what the UI shows. A view-only user who manipulates the browser to send a card-move event receives a `FORBIDDEN` error and their action is silently discarded. The UI gate can be bypassed. The server gate cannot.

**2. Never trust data from the client.**
Every piece of data that arrives from the browser — user IDs, board IDs, card content, permission claims — is treated as untrusted input until validated server-side. The client never dictates who it is; the server resolves identity from a verified JWT. The client never claims permissions; the server computes them from the database.

**3. Fail closed, not open.**
When in doubt, deny. If a permission check encounters unexpected state (missing membership record, unknown role, malformed ID), the system throws `FORBIDDEN` rather than defaulting to access. A user who cannot be verified as having permission gets no access.

---

## 2. Global Security Rules (Apply to Every Step)

These rules apply regardless of which step you are working on. Treat them as permanent background requirements.

### 2.1 Secrets Never Enter Source Code

**[REQUIRED]** No API key, secret key, database URL, webhook secret, or any credential ever appears in any `.ts`, `.tsx`, `.js`, or `.json` file that is committed to Git. Every credential lives in `.env.local` (development) or the hosting platform's environment variable system (production).

**Verify:** Before every `git commit`, run `git diff --staged` and scan for strings that look like keys (`sk_`, `pk_`, `rediss://`, `https://...convex.cloud`). If any appear, abort the commit immediately.

### 2.2 `.env.local` Is in `.gitignore` Before Credentials Are Added

**[REQUIRED]** The `.gitignore` entry for `.env.local` must be added in Step 1.8 — before any credentials are written to that file in Step 1.5. The order matters: add `.gitignore` protection first, then add credentials.

### 2.3 `NEXT_PUBLIC_` Variables Contain No Secrets

**[REQUIRED]** Any variable prefixed with `NEXT_PUBLIC_` is bundled into the client-side JavaScript and is readable by anyone who inspects the browser. Only these variables are safe to make public:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — safe (designed to be public)
- `NEXT_PUBLIC_CONVEX_URL` — safe (a deployment endpoint, not a secret)
- `NEXT_PUBLIC_SOCKET_URL` — safe (a public server URL)

The following are **never** `NEXT_PUBLIC_`:
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `UPSTASH_REDIS_URL`
- `UPSTASH_REDIS_TOKEN`

### 2.4 Every Convex Mutation Starts with `requireUser`

**[REQUIRED]** Without exception: the first line of every Convex mutation and every Convex query that returns user-specific data calls `requireUser(ctx)`. If this call throws (unauthenticated or user not found), the function stops immediately. No data is read or written.

```ts
// Correct pattern — every single mutation starts like this:
export const someAction = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)  // ← FIRST LINE, always
    // ... rest of logic
  }
})
```

### 2.5 TypeScript Strict Mode Is Always On

**[REQUIRED]** `tsconfig.json` must have `"strict": true`. TypeScript strict mode catches null/undefined access patterns that are common sources of security bugs (e.g., accessing `user.id` without checking if `user` is null first).

### 2.6 Never Log Sensitive Data

**[REQUIRED]** `console.log`, `console.error`, and any logging call must never print:
- JWT tokens or any part of them
- Passwords or password hashes
- Email addresses (beyond the first signup confirmation)
- Full user records
- Database query results containing PII

Log IDs and action types. Never log content.

### 2.7 Dependencies Are Pinned and Reviewed Before Install

**[REQUIRED]** Before running `npm install <package>`:
1. Check the package on npmjs.com — verify it has recent activity, a known maintainer, and a reasonable download count
2. Check for known vulnerabilities: `npm audit` after install
3. Never install a package suggested by an error message or a forum post without verifying the exact package name on npmjs.com (typosquatting is a real attack vector)

---

## 3. Authentication & Authorization Architecture

### 3.1 Two-Layer Auth: Clerk (Identity) + Convex (Authorization)

```
Browser → Clerk JWT → Convex mutation handler
                    → requireUser() resolves internal user record
                    → assertBoardPermission() or assertWorkspaceRole() checks access
                    → Data read/written only if both checks pass
```

**Clerk** is responsible only for identity — proving who the user is via a cryptographically signed JWT. It does not make authorization decisions.

**Convex** is responsible for authorization — every mutation checks what the verified user is allowed to do before touching the database.

### 3.2 JWT Verification Chain

| Point | Verified By | Method |
|---|---|---|
| Sign-in form | Clerk | Clerk's own infrastructure |
| Convex mutation/query | Convex platform | Clerk JWKS URL configured in Convex dashboard |
| Socket.IO connection | Socket.IO auth middleware | `@clerk/backend` `verifyToken()` with `CLERK_SECRET_KEY` |
| Clerk webhook | Next.js API route | `svix` library signature verification |

**[REQUIRED]** The Clerk Issuer URL must be configured in the Convex dashboard (Settings → Authentication) before any mutations are tested. Without it, `ctx.auth.getUserIdentity()` returns `null` for all requests.

### 3.3 Permission Levels and What They Allow

| Level | Can Read Cards | Can Comment | Can Move Cards | Can Edit Cards | Can Manage Columns |
|---|---|---|---|---|---|
| `view` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `comment` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `edit` | ✅ | ✅ | ✅ | ✅ | ✅ |

**[REQUIRED]** These rules are enforced in Convex mutation handlers. The UI may hide controls as a convenience, but the server re-checks on every request.

### 3.4 Workspace Role Hierarchy

| Role | Can Create Boards | Can Invite Members | Can Remove Members | Can Delete Workspace |
|---|---|---|---|---|
| `guest` | ❌ | ❌ | ❌ | ❌ |
| `member` | ✅ | ❌ | ❌ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ❌ |
| `owner` | ✅ | ✅ | ✅ | ✅ |

### 3.5 The `createUser` Mutation Is Internal-Only

**[REQUIRED]** The `createUser` mutation in `convex/users.ts` must be declared as an `internalMutation`, not a regular `mutation`. This means it can only be called from:
- Other Convex internal functions
- The Next.js webhook handler via `fetchMutation` with service credentials

It cannot be called by any browser client. A client attempting to call it will receive an error. This prevents users from injecting arbitrary user records into the database.

---

## 4. Secrets & Credentials Management

### 4.1 Complete Credential Inventory

| Credential | Where Stored (Dev) | Where Stored (Prod) | Who Can Access |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | Vercel env vars | Public (safe) |
| `CLERK_SECRET_KEY` | `.env.local` | Vercel env vars | Server-only |
| `CLERK_WEBHOOK_SECRET` | `.env.local` | Vercel env vars | Server-only (API route) |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Vercel env vars | Public (safe) |
| `NEXT_PUBLIC_SOCKET_URL` | `.env.local` | Vercel env vars | Public (safe) |
| `CLERK_SECRET_KEY` (Socket.IO) | `server/.env` | Render env vars | Socket.IO server only |
| `UPSTASH_REDIS_URL` | `server/.env` | Render env vars | Socket.IO server only |

**[REQUIRED]** Development and production must use separate Clerk applications with separate keys. Never use the same `CLERK_SECRET_KEY` in both environments. Clerk provides separate "Development" and "Production" instances for this purpose.

### 4.2 Rotating Compromised Credentials

If a secret key is accidentally committed to Git:
1. Immediately invalidate it in the service's dashboard (Clerk → API Keys → Rotate, Upstash → Reset password)
2. Generate a new key
3. Update `.env.local` and all hosting platform environment variables
4. Force-push to remove the commit from history OR consider the repository compromised and create a new one
5. Audit all activity in the service dashboard for the period the key was exposed

### 4.3 The `server/.env` File Is Also Gitignored

**[REQUIRED]** The `server/` directory has its own `.env` file for Socket.IO server credentials. This file must also be in `.gitignore`. Add it before adding any credentials.

### 4.4 Vercel Environment Variables Are Not Logged

When setting environment variables in Vercel, use the "Sensitive" toggle for `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SECRET`. This prevents them from appearing in build logs.

---

## 5. Input Validation & Sanitization Standards

### 5.1 Convex Schema Validators Are the First Line of Defense

Convex uses runtime validators on all mutation arguments. These run before any handler code executes. Use them on every field:

```ts
export const createCard = mutation({
  args: {
    columnId: v.id('columns'),    // Must be a valid Convex ID pointing to 'columns' table
    title: v.string(),            // Must be a string
  },
  handler: async (ctx, args) => { ... }
})
```

**[REQUIRED]** Every mutation argument must have a Convex validator. `v.any()` is only permitted for Tiptap JSON bodies (where the schema is enforced structurally by Tiptap, not by Convex) and for activity log metadata.

### 5.2 String Length Limits

**[REQUIRED]** Apply maximum length limits to all user-supplied string fields. Reject inputs that exceed them with a `ConvexError`. These limits prevent storage abuse and UI overflow bugs.

| Field | Maximum Length | Validation Location |
|---|---|---|
| Workspace name | 100 characters | `createWorkspace` mutation |
| Workspace slug | 63 characters | `generateUniqueSlug` utility |
| Board title | 100 characters | `createBoard`, `updateBoard` mutations |
| Column title | 100 characters | `createColumn`, `updateColumn` mutations |
| Card title | 255 characters | `createCard`, `updateCard` mutations |
| Card description (JSON string) | 50,000 characters | `updateCard` mutation |
| Comment body (JSON string) | 10,000 characters | `createComment`, `updateComment` mutations |
| Chat message body | 2,000 characters | `sendChatMessage` mutation |
| Label name | 50 characters | `setCardLabels` mutation |
| Due date string | 10 characters (ISO YYYY-MM-DD) | `updateCard` mutation |

### 5.3 Non-Empty Validation

**[REQUIRED]** Strings that must not be blank must be explicitly validated:
```ts
if (args.title.trim().length === 0) {
  throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Title cannot be empty' })
}
```

Apply this to: workspace name, board title, column title, card title, chat message body.

### 5.4 ID Validation

Convex's `v.id('tableName')` validator verifies that the provided ID:
- Is a valid Convex ID format
- References the correct table

**[REQUIRED]** After receiving an ID, always call `ctx.db.get(id)` and check for `null` before using the record. An ID that passes format validation may still reference a deleted record.

```ts
const column = await ctx.db.get(args.columnId)
if (!column) throw new ConvexError({ code: 'NOT_FOUND', message: 'Column not found' })
```

### 5.5 Workspace Slug Sanitization

The `generateUniqueSlug` utility converts workspace names to URL-safe slugs. **[REQUIRED]** The sanitization must:
- Convert to lowercase
- Replace spaces with hyphens
- Remove all characters that are not alphanumeric or hyphens (`/[^a-z0-9-]/g`)
- Collapse consecutive hyphens into one
- Strip leading and trailing hyphens
- Enforce a minimum of 2 characters

This prevents slugs that could be mistaken for route parameters or system paths.

### 5.6 Invite Token Validation

**[REQUIRED]** Invite tokens must be generated using `crypto.randomUUID()` — this produces a cryptographically random 128-bit UUID. Never generate tokens using `Math.random()` (predictable), sequential IDs (enumerable), or user-supplied values.

When accepting an invite:
```ts
// Validate: token exists, not expired, not already used
const invite = await ctx.db.query('workspaceInvites')
  .withIndex('by_token', q => q.eq('token', args.token))
  .unique()

if (!invite) throw new ConvexError({ code: 'INVITE_INVALID' })
if (invite.expiresAt < Date.now()) throw new ConvexError({ code: 'INVITE_EXPIRED' })
if (invite.usedAt !== undefined) throw new ConvexError({ code: 'INVITE_USED' })
```

### 5.7 Due Date Format Validation

**[REQUIRED]** Due dates are stored as ISO 8601 date strings (`YYYY-MM-DD`). Validate the format before storing:
```ts
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
if (args.dueDate && !dateRegex.test(args.dueDate)) {
  throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Invalid date format' })
}
```

### 5.8 @Mention ID Validation

**[REQUIRED]** When scanning a comment body for @mention nodes, every extracted user ID must be validated against the workspace membership table before creating a notification. A client can craft a Tiptap JSON body containing any user ID. Only workspace members receive notifications.

```ts
// In createComment mutation, for each mention userId:
const membership = await ctx.db
  .query('workspaceMembers')
  .withIndex('by_workspace_and_user', q =>
    q.eq('workspaceId', workspaceId).eq('userId', mentionedUserId))
  .unique()

if (!membership) continue  // silently ignore non-members
```

---

## 6. XSS Prevention

Cross-Site Scripting (XSS) is the injection of malicious scripts into content rendered by other users' browsers. OnPoint has multiple user-generated content fields. Each one has a specific protection strategy.

### 6.1 Never Store Raw HTML

**[REQUIRED]** Card descriptions and comments are stored as Tiptap ProseMirror JSON — a structured object representation of the document. Raw HTML is never stored in the database. This is the primary XSS defense for rich text content.

Why JSON is safe: even if a user crafts a malicious JSON body, Tiptap's `generateHTML` renderer only outputs HTML for known, allowed node types (paragraph, bold, italic, mention, etc.). Unknown node types are ignored.

### 6.2 Never Use `dangerouslySetInnerHTML` with User-Supplied Strings

**[REQUIRED]** The only permitted use of `dangerouslySetInnerHTML` in the codebase is rendering the output of Tiptap's `generateHTML()` function — which generates HTML from a controlled JSON schema, not from raw user input.

This is never permitted:
```tsx
// FORBIDDEN — never do this
<div dangerouslySetInnerHTML={{ __html: card.title }} />
<div dangerouslySetInnerHTML={{ __html: comment.rawBody }} />
```

This is the only permitted pattern:
```tsx
// PERMITTED — Tiptap generates the HTML from structured JSON
const html = generateHTML(comment.body, [StarterKit, Mention])
<div dangerouslySetInnerHTML={{ __html: html }} />
```

### 6.3 Chat Messages Are Plain Text

**[REQUIRED]** Chat message bodies are plain text strings, not rich text. They are rendered as React text nodes, not as HTML. React automatically escapes text content, preventing XSS.

```tsx
// Correct: React text node — automatically escaped
<p>{message.body}</p>

// FORBIDDEN: rendering as HTML
<p dangerouslySetInnerHTML={{ __html: message.body }} />
```

### 6.4 Card Titles, Column Names, and Workspace Names Are Plain Text

**[REQUIRED]** These fields are rendered as React text nodes in all components. They are never passed to `dangerouslySetInnerHTML`.

### 6.5 Tiptap Mention Rendering

The `@mention` extension renders a styled inline node. When `generateHTML` converts a mention node to HTML, it renders a `<span>` with a CSS class and the user's display name as text content. The display name is a text node, not innerHTML.

**[REQUIRED]** The `HTMLAttributes` for the Mention extension must not include `innerHTML`. Use `data-*` attributes or text content only:
```ts
Mention.configure({
  HTMLAttributes: {
    class: 'mention',
    // data-id is safe — it's an attribute, not rendered HTML
  }
})
```

### 6.6 Activity Log Entries

Activity log metadata (card titles, column names, actor names) is injected into human-readable strings in `lib/formatActivityEntry.ts`. **[REQUIRED]** The output of `formatActivityEntry` is rendered as a React text node, not as HTML.

---

## 7. Data Protection & Encryption

### 7.1 Encryption at Rest

Convex encrypts all stored data at rest on its infrastructure. This is handled by the platform — no additional configuration is required. Upstash Redis also encrypts data at rest.

### 7.2 Encryption in Transit

**[REQUIRED]** All connections use TLS:
- Next.js on Vercel: HTTPS enforced automatically
- Convex: all connections use WSS/HTTPS
- Socket.IO on Render: HTTPS/WSS (Render provides TLS termination)
- Upstash Redis: `rediss://` URL (double `s` = TLS). Using a `redis://` URL (without TLS) is forbidden.

### 7.3 PII Minimization

OnPoint stores the following PII: user's name, email address, and avatar URL. These are pulled from Clerk at sign-up.

**[REQUIRED]** PII is never:
- Included in activity log metadata (use user IDs, not names — resolve names at query time)
- Included in Socket.IO event payloads beyond what is necessary for rendering (display name is acceptable; email is not)
- Logged to the console in production

### 7.4 Data Scoping

**[REQUIRED]** Every query that returns user data must be scoped to the requesting user's access:
- Workspace queries return only workspaces the caller belongs to
- Board queries return only boards visible to the caller
- Notification queries return only the caller's own notifications
- Chat queries return only messages from boards the caller can access

No query returns a full table scan of user data.

### 7.5 Removing a User's Data on Workspace Exit

When a user is removed from a workspace via `removeMember`, the following personal data associations are cleaned up:
- Their `workspaceMembers` record is deleted
- Their `boardMembers` overrides are deleted
- Cards assigned to them retain the `assigneeId` (audit trail) but the user loses access to view those cards

**[REQUIRED]** Removing a member must not cascade-delete cards they created or comments they wrote. This data belongs to the workspace's audit trail, not to the user personally.

---

## 8. API & WebSocket Security

### 8.1 Clerk Webhook Signature Verification

The webhook handler at `/api/webhooks/clerk/route.ts` is a publicly accessible HTTP endpoint. Anyone can POST to it.

**[REQUIRED]** Every incoming request must be verified using the `svix` library before any processing occurs:
```ts
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
try {
  evt = wh.verify(body, headers) as WebhookEvent
} catch {
  return new Response('Invalid signature', { status: 400 })
}
// Only process verified events
```

If signature verification fails, return `400` immediately. Do not process the payload. Do not log the payload body (it may contain PII).

### 8.2 Socket.IO Auth Middleware Runs Before Any Event Handler

**[REQUIRED]** The `io.use(authMiddleware)` call must be registered before `io.on('connection', handleConnection)`. This guarantees that no event handler can fire for an unauthenticated connection.

```ts
io.use(authMiddleware)              // ← registered first
io.on('connection', handleConnection)  // ← only reached after auth passes
```

A connection that fails auth middleware never reaches the connection handler. It is disconnected before any `on('JOIN_BOARD', ...)` listeners are registered.

### 8.3 Socket.IO Does Not Re-Verify JWT on Every Event

The JWT is verified once at connection time. After that, `socket.data.userId` is trusted for the lifetime of the connection. This is correct because:
- JWTs have an expiry — an expired JWT will fail reconnection
- The Socket.IO server does not store JWTs — only the decoded `userId` and `userName`
- If a user's session is revoked in Clerk, their next reconnection attempt will fail

**[REQUIRED]** `socket.data.userId` must never be supplied by the client. It is set exclusively by the auth middleware from the verified JWT payload.

### 8.4 Socket.IO CORS Must Be Locked to Specific Origin

**[REQUIRED]** The Socket.IO server's CORS configuration must specify the exact frontend origin, never a wildcard:

```ts
// CORRECT:
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN,  // e.g. "https://onpoint.vercel.app"
    credentials: true,
  }
})

// FORBIDDEN:
cors: { origin: '*' }  // allows any website to connect
```

A wildcard CORS origin would allow any website to establish WebSocket connections to the server using a logged-in user's browser credentials.

### 8.5 Rate Limiting Is Security, Not Just Performance

**[REQUIRED]** The Redis-based rate limiter (30 events per 10 seconds per user) must be applied to every broadcast event handler. This is a security control, not just a performance optimization. Without it, a single malicious client can flood the server with events, degrading the experience for all users on the same board.

If a user exceeds the rate limit, their socket receives `RATE_LIMITED` and no events are broadcast. The socket is not disconnected (to allow recovery), but the offending event is silently dropped.

### 8.6 Next.js API Routes Are Server-Only

The only API route in the project is the Clerk webhook handler. **[REQUIRED]** Verify this route:
- Reads `CLERK_WEBHOOK_SECRET` from `process.env` (server-only)
- Does not import or reference any `NEXT_PUBLIC_` variables
- Does not return any database contents in the response body (return only `"OK"` or an error code)

### 8.7 Board Room Membership Is Not Verified by Socket.IO

The Socket.IO server trusts that a user who joins a board room has permission to be there. It does not query Convex to verify board membership. This is acceptable because:
- The client's ability to join a room is low-risk (presence data only, no sensitive content)
- All sensitive data comes from Convex, which enforces permissions on every query
- A malicious user who joins a room they don't belong to receives event signals but cannot read card content (that comes from Convex queries, which enforce permissions)

**[OPERATIONAL NOTE]** This is a known and accepted design tradeoff. The Socket.IO server handles ephemerality; Convex handles data access control.

---

## 9. Database Security Practices

### 9.1 No Direct Database Access from Client

**[REQUIRED]** The Convex database is only accessible through Convex query and mutation functions. Clients call Convex functions — they do not issue raw database queries. This is enforced by Convex's architecture.

### 9.2 Every Mutation Enforces Ownership Before Writing

**[REQUIRED]** Before patching or deleting any record, verify the caller owns or has permission over that record:

```ts
// CORRECT:
const card = await ctx.db.get(args.cardId)
if (!card) throw new ConvexError({ code: 'NOT_FOUND' })
await assertBoardPermission(ctx, card.boardId, user._id, 'edit')
await ctx.db.patch(args.cardId, { title: args.title })

// WRONG — patches without checking ownership:
await ctx.db.patch(args.cardId, { title: args.title })
```

### 9.3 Comment Author Enforcement

**[REQUIRED]** `updateComment` and `deleteComment` must verify the caller is the comment author before making changes:

```ts
const comment = await ctx.db.get(args.commentId)
if (!comment) throw new ConvexError({ code: 'NOT_FOUND' })

// For updates: author only
if (comment.authorId !== user._id) {
  throw new ConvexError({ code: 'FORBIDDEN', message: 'Only the author can edit this comment' })
}

// For deletes: author OR board admin
const permission = await getEffectiveBoardPermission(ctx, comment.boardId, user._id)
if (comment.authorId !== user._id && permission !== 'edit') {
  throw new ConvexError({ code: 'FORBIDDEN' })
}
```

### 9.4 Activity Log Is Immutable

**[REQUIRED]** The `activityLogs` table must not have any `update` or `delete` mutations. The only permitted operation is `ctx.db.insert`. This is both a security control (audit trails must not be tampered with) and a data integrity guarantee.

### 9.5 Notification Ownership Enforcement

**[REQUIRED]** `markAsRead` and `markAllAsRead` must only modify notifications belonging to the calling user:

```ts
const notification = await ctx.db.get(args.notificationId)
if (notification.userId !== user._id) {
  throw new ConvexError({ code: 'FORBIDDEN' })
}
```

### 9.6 Cascade Deletes Must Be Explicit

**[REQUIRED]** When deleting a workspace, board, or column, all child records must be explicitly deleted in the correct order (deepest children first). Relying on implicit cascade behavior is not acceptable — Convex does not have foreign key cascade deletes. Orphaned records left after a deletion are a data leak.

Correct deletion order for a column:
1. Delete all `cardLabels` for each card
2. Delete all `comments` for each card
3. Delete all `cardHistory` for each card
4. Delete all `notifications` referencing each card
5. Delete all `cards`
6. Delete the `column`

### 9.7 Cross-Workspace Data Access Is Impossible by Design

**[REQUIRED]** Every board query includes a `workspaceId` check or resolves through a chain that includes it. A user in Workspace A cannot access data from Workspace B, even if they know a valid board ID, because:
1. `assertBoardPermission` checks `boardMembers` and `workspaceMembers`
2. `workspaceMembers` contains only members of the specific workspace
3. A user not in the workspace has no `workspaceMembers` record → permission resolves to `null` → `FORBIDDEN`

---

## 10. Step-by-Step Security Rules

This section maps security requirements to every step and substep in the Implementation Plan. Each rule is prefixed with **[REQUIRED]** (must be implemented before the step is complete) or **[NOTE]** (informational guidance).

---

### Step 1: Project Foundation

#### 1.1 — Initialize the Next.js project
- **[REQUIRED]** Do not commit the initial project until `.gitignore` includes `.env.local` and `server/.env`.
- **[NOTE]** `create-next-app` generates a `.gitignore` automatically — verify it includes `.env*.local` before adding any files.

#### 1.2 — Configure Tailwind for dark mode
- **[NOTE]** No security concerns. Pure styling configuration.

#### 1.3 — Install and configure shadcn/ui
- **[REQUIRED]** After running `npx shadcn@latest init`, run `npm audit`. If any high-severity vulnerabilities are reported in installed packages, investigate before proceeding.
- **[NOTE]** shadcn/ui copies component source code into the project. The copied code is auditable — review it if unexpected network calls or `eval` usage appears.

#### 1.4 — Set up Convex
- **[REQUIRED]** The `NEXT_PUBLIC_CONVEX_URL` added to `.env.local` must be the development deployment URL. Do not use the production deployment URL in local development.
- **[REQUIRED]** After `npx convex dev` creates the `convex/` folder, verify `convex/_generated/` is in `.gitignore`. Generated files should not be committed.
- **[NOTE]** `convex/schema.ts` is safe to commit — it contains no credentials.

#### 1.5 — Set up Clerk
- **[REQUIRED]** `CLERK_SECRET_KEY` is added to `.env.local`. Verify `.env.local` is already in `.gitignore` before this step (see 1.8 order — this is why `.gitignore` is set up in 1.8 as the last substep of Step 1, but credentials are added in 1.5. **Correction:** Set up `.gitignore` for `.env.local` immediately in Step 1.1 before any other substep writes credentials).
- **[REQUIRED]** Use the Clerk **Development** instance keys in `.env.local`. The Production instance keys are only used in Vercel environment variables during Step 18.

#### 1.6 — Wire up providers
- **[REQUIRED]** `ConvexProviderWithClerk` passes the Clerk JWT to Convex automatically. Do not manually extract or pass JWT tokens in component code — this is handled by the provider.
- **[NOTE]** The provider wrapping order (ThemeProvider → ConvexClerkProvider) has no security implications.

#### 1.7 — Set up Clerk middleware
- **[REQUIRED]** The middleware must protect the `(app)` route group completely. Verify there are no gaps — all routes under `/(app)/` must require authentication.
- **[REQUIRED]** `/invite/[token]` is a public route (users may not be signed in when they click an invite link). However, the `acceptInvite` Convex mutation still requires authentication — an unauthenticated user clicking an invite link must be redirected to sign-in first, then to the invite acceptance page.
- **[REQUIRED]** Test the middleware by visiting a protected route while logged out in an incognito window. The redirect to `/sign-in` must occur.

#### 1.8 — Set up project folder structure
- **[REQUIRED]** `.env.local` and `server/.env` must be in `.gitignore` before this commit.
- **[REQUIRED]** Run `git status` and confirm no `.env` files appear as untracked.

---

### Step 2: Authentication & User Sync

#### 2.1 — Build sign-in and sign-up pages
- **[REQUIRED]** Use Clerk's hosted `<SignIn>` and `<SignUp>` components. Do not build custom authentication forms. Clerk handles password hashing, rate limiting on failed attempts, account lockout, and CSRF protection.
- **[NOTE]** The `afterSignInUrl` and `afterSignUpUrl` props redirect to `/onboarding`. Verify these are relative paths, not absolute URLs that could be used for open redirects.

#### 2.2 — Create user mutations in Convex
- **[REQUIRED]** `createUser` must be declared as `internalMutation` (not `mutation`). This makes it uncallable by browser clients.
- **[REQUIRED]** `requireUser` in `convex/lib/auth.ts` must throw `ConvexError` — not return `null` — when the user is not found. This ensures callers cannot accidentally proceed without a verified user.
- **[REQUIRED]** `getMe` query must call `requireUser` first. It must never return another user's data.

#### 2.3 — Build the Clerk webhook handler
- **[REQUIRED]** Signature verification with `svix` is non-negotiable. The handler must not process any event before calling `wh.verify()` successfully.
- **[REQUIRED]** The raw request body must be read as text (`await req.text()`) before parsing as JSON. The `svix` library verifies against the raw body — parsing first corrupts the verification.
- **[REQUIRED]** `CLERK_WEBHOOK_SECRET` must be read from `process.env` — never hardcoded.
- **[REQUIRED]** The webhook endpoint URL (`/api/webhooks/clerk`) must be registered only in the Clerk dashboard for the matching environment (Development webhook for local, Production webhook for Vercel). Never register a production webhook pointing to localhost.
- **[NOTE]** The Clerk CLI forwarding command (`npx clerk webhooks listen`) creates a temporary tunnel. This is acceptable for development only — it is never used in production.

#### 2.4 — Build the onboarding page
- **[REQUIRED]** The onboarding page is accessible only to authenticated users (protected by middleware). However, `createWorkspace` in Convex must still call `requireUser` — never assume the frontend enforced authentication.
- **[REQUIRED]** Workspace name input must be trimmed and validated for length before calling the Convex mutation. Empty names must be rejected client-side with an error message, and server-side with a `ConvexError`.

#### 2.5 — Add first-login redirect logic
- **[REQUIRED]** The redirect check (user has no workspaces → redirect to `/onboarding`) must happen server-side using Clerk's `auth()` function in the server component. This prevents a brief flash of protected content before the redirect fires.

---

### Step 3: Workspace Layer

#### 3.1 — Complete workspace Convex backend
- **[REQUIRED]** `deleteWorkspace` must verify the caller is the workspace `owner` (not just `admin`) before executing the cascade delete. Only the owner can destroy a workspace.
- **[REQUIRED]** `updateWorkspaceName` must call `assertWorkspaceRole(admin)` — members and guests cannot rename workspaces.
- **[REQUIRED]** `listMembers` must verify the caller is a member of the workspace before returning the member list. Non-members must not be able to enumerate workspace members.

#### 3.2 — Build the invite system
- **[REQUIRED]** Invite tokens are generated using `crypto.randomUUID()` — never `Math.random()`.
- **[REQUIRED]** Invite expiry is enforced server-side in `acceptInvite`. Client-side expiry checks (e.g., disabling a button after 7 days) are cosmetic only.
- **[REQUIRED]** `acceptInvite` must check that the accepting user is not already a workspace member. Inserting a duplicate `workspaceMembers` row would corrupt the permission system.
- **[REQUIRED]** After accepting an invite, mark it as used (`usedAt = Date.now()`) atomically in the same mutation. Do not mark it used in a separate step — a race condition between two concurrent acceptances of the same token must result in only one succeeding.
- **[NOTE]** The invite link URL displayed to the user contains the token. Treat it as a secret — do not log it.

#### 3.3 — Build workspace member management backend
- **[REQUIRED]** `updateMemberRole` must prevent a user from elevating their own role. A `member` cannot promote themselves to `admin`.
- **[REQUIRED]** `removeMember` must prevent removing the workspace owner. Check `workspace.ownerId !== targetUserId` before deletion.
- **[REQUIRED]** `transferOwnership` must be a single atomic operation: set new owner's role to `owner` and old owner's role to `admin` in the same mutation.

#### 3.4 — Build the app shell
- **[REQUIRED]** `listMyWorkspaces` returns only workspaces where the caller has a `workspaceMembers` record. It must not return all workspaces in the database.
- **[NOTE]** The `UserMenu` shows the user's email. This is safe — the user is viewing their own data.

#### 3.5 — Build the workspace dashboard
- **[REQUIRED]** `listByWorkspace` must filter boards based on the caller's access. Private boards are only returned if the caller has an explicit `boardMembers` record or is a workspace admin/owner. A workspace member must not see private boards they were not added to.

#### 3.6 — Build workspace settings page
- **[REQUIRED]** The workspace settings page must verify at the server level (in a server component or via Convex query) that the caller is an admin or owner before rendering management controls. Do not rely solely on hiding UI elements.
- **[REQUIRED]** The "Delete Workspace" action must be behind an `AlertDialog` requiring explicit confirmation text entry (e.g., "Type the workspace name to confirm"). This is a destructive, irreversible operation.
- **[REQUIRED]** Invite links displayed in the UI expire after 7 days. Do not show expired links.

#### 3.7 — Wire the onboarding join flow
- **[REQUIRED]** The token is extracted from the URL the user pastes. Use `URL` parsing, not string splitting, to extract it reliably. Validate the token is a non-empty string before sending to Convex.

---

### Step 4: Backend Data Layer

#### 4.1 — Implement the permission system
- **[REQUIRED]** `assertBoardPermission` must be the single, canonical function for all board-level permission checks. Do not write inline permission logic in individual mutations — always route through this helper.
- **[REQUIRED]** When `getEffectiveBoardPermission` returns `null`, it means the user has no access to the board. This must be treated the same as the lowest permission level — deny access.
- **[REQUIRED]** Test the permission system with three user scenarios before moving on: (a) user with `edit` permission can mutate, (b) user with `view` permission is denied mutations, (c) user with no workspace membership is denied all access.

#### 4.2 — Implement the activity log helper
- **[REQUIRED]** The `writeActivityLog` function must use `ctx.db.insert` only — never `ctx.db.patch` or `ctx.db.delete`. Activity log entries are immutable.
- **[NOTE]** Metadata stored in `activityLogs.metadata` may contain previous field values (e.g., previous card title). Do not store full card descriptions or comment bodies here — they may be large and are stored in their own tables.

#### 4.3 — Implement board mutations and queries
- **[REQUIRED]** `deleteBoard` must only be callable by a workspace `admin` or `owner` — not by a board `edit` user who is merely a workspace `member`. Check workspace role, not board permission.
- **[REQUIRED]** `setBoardMemberPermission` requires workspace `admin` or `owner`. A board `edit` user cannot grant themselves or others permissions.

#### 4.4 — Implement column mutations and queries
- **[REQUIRED]** `deleteColumn` must resolve the board ID from the column record in the database — not from a client-supplied `boardId` argument. Never trust client-supplied IDs to establish ownership chains.
- **[REQUIRED]** `reindexColumnCards` assigns new `orderIndex` values to all cards. This must be wrapped in the same mutation that triggers it to avoid a window where order indices are temporarily inconsistent.

#### 4.5 — Implement card mutations and queries
- **[REQUIRED]** `createCard` must resolve `boardId` from the column record in the database. The client supplies a `columnId` — the `boardId` is computed server-side by looking up the column.
- **[REQUIRED]** `deleteCard` must clean up all associated `notifications` for the card being deleted. Stale notifications pointing to deleted cards must not persist.
- **[REQUIRED]** `moveCard` validates that the destination column (`newColumnId`) belongs to the same board as the card. A client must not be able to move a card from Board A to a column on Board B.

```ts
// Verify destination column is on the same board
const destinationColumn = await ctx.db.get(args.newColumnId)
if (!destinationColumn || destinationColumn.boardId !== card.boardId) {
  throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Column does not belong to this board' })
}
```

#### 4.6 — Verify the full data layer end-to-end
- **[REQUIRED]** Use the Convex dashboard function runner to call `deleteCard` as a user who does not have `edit` permission. Verify the call fails with `FORBIDDEN`.
- **[REQUIRED]** Verify that calling `moveCard` with a `newColumnId` belonging to a different board fails with `VALIDATION_ERROR`.

---

### Step 5: Board View — Static UI

#### 5.1 — Build the board page and header
- **[REQUIRED]** The board page component fetches `boardId` from URL params. Validate it is a non-empty string before using it in a Convex query. An invalid or missing `boardId` must render an error state, not crash.
- **[NOTE]** If `useQuery(api.boards.get, { boardId })` returns `null`, the user either navigated to a nonexistent board or lost access. Render a "Board not found" message.

#### 5.2 — Build the static column and card list
- **[REQUIRED]** All card titles, column names, and label names rendered in list views must be React text nodes. They are never injected as HTML.
- **[REQUIRED]** The assignee avatar uses the `avatarUrl` field from the user record. This is a URL from Clerk. When rendering it in an `<img>` tag, set `referrerPolicy="no-referrer"` to avoid leaking the current page URL to external image hosts.

#### 5.3 — Build the board settings page
- **[REQUIRED]** The board settings page must load the caller's workspace role server-side and pass it to the component. Admin-only sections (member permission overrides) must not render for non-admin users.

---

### Step 6: Card Modal

#### 6.1 — Build the card modal shell
- **[REQUIRED]** The card modal uses `openCardId` state to control visibility. When the modal is opened, verify the card ID is a valid Convex ID before calling `useQuery`. Never pass an empty string or `undefined` to a Convex query.

#### 6.2 — Build the Tiptap description editor
- **[REQUIRED]** The `editable` prop must reflect the caller's board permission. Users with `comment` or `view` permission get `editable: false`. The Convex `updateCard` mutation independently enforces this — the read-only editor is a UI convenience.
- **[REQUIRED]** The `editor.getJSON()` output is stored as-is in Convex. Do not call `editor.getHTML()` and store that — HTML storage is forbidden.

#### 6.3 — Build the assignee picker
- **[REQUIRED]** The assignee picker lists workspace members from `api.workspaceMembers.list`. Verify this query enforces that the caller is a workspace member before returning member data.
- **[NOTE]** A removed member's name will no longer appear in the dropdown. The card retains their ID in `assigneeId` until explicitly reassigned.

#### 6.4 — Build the label picker
- **[REQUIRED]** Label `color` values must be validated against a whitelist of permitted Tailwind color names (e.g., `["red", "blue", "orange", "purple", "gray", "green"]`). Do not allow arbitrary color strings — they could inject CSS.

#### 6.5 — Build the due date picker
- **[REQUIRED]** Apply the ISO date format validation from section 5.7 when the date is sent to `updateCard`.

#### 6.6 — Build the card history tab
- **[REQUIRED]** `getHistory` must call `assertBoardPermission(view)` before returning results. Card history is not public.
- **[NOTE]** The history tab renders previous card titles and descriptions. Previous titles are text nodes (safe). Previous descriptions are Tiptap JSON — render them using `generateHTML` in read-only mode if displaying the content, or just display a field-name label if not.

#### 6.7 — Build the comment thread
- **[REQUIRED]** The comment author display name is fetched from the `users` table in the query — not trusted from the comment record itself. The comment record stores `authorId` (an ID reference), not a name string.

#### 6.8 — Add delete card action
- **[REQUIRED]** Use an `AlertDialog` (not a regular `Dialog`) for the delete confirmation. `AlertDialog` requires explicit user action to confirm — it cannot be dismissed by pressing Escape or clicking outside.

---

### Step 7: Drag-and-Drop

#### 7.1 — Install and configure dnd-kit
- **[REQUIRED]** Run `npm audit` after installing dnd-kit packages. Verify no high-severity vulnerabilities.

#### 7.2 — Wrap the board in DndContext
- **[REQUIRED]** The `activationConstraint: { distance: 8 }` on `PointerSensor` is a usability control, not a security one. Do not remove it — it prevents inadvertent drag initiation on card clicks.

#### 7.3 — Make cards sortable
- **[NOTE]** No security concerns specific to this substep.

#### 7.4 — Make columns sortable
- **[NOTE]** No security concerns specific to this substep.

#### 7.5 — Implement the onDragEnd handler
- **[REQUIRED]** The `onDragEnd` handler fires a Convex `moveCard` mutation. If the mutation returns a `FORBIDDEN` error, the optimistic UI update must be reverted. The card must snap back to its original position. Never silently absorb a permission rejection.
- **[REQUIRED]** Validate that `active.id` and `over.id` are non-null before computing the new position. A null drop target means the user dropped the card outside any column — treat this as a no-op, not an error.

---

### Step 8: Socket.IO Server

#### 8.1 — Initialize the Socket.IO server project
- **[REQUIRED]** `server/.env` must be in `server/.gitignore` (or the root `.gitignore`) before this commit.
- **[REQUIRED]** Run `npm audit` after the initial `npm install`. Address any high-severity vulnerabilities before proceeding.

#### 8.2 — Set up the HTTP and Socket.IO server
- **[REQUIRED]** The CORS `origin` must be read from `process.env.ALLOWED_ORIGIN`. It must not be hardcoded. It must not be `"*"`.
- **[REQUIRED]** The server must not expose any HTTP endpoints other than the Socket.IO handshake path. No REST routes.

#### 8.3 — Implement auth middleware
- **[REQUIRED]** The middleware must call `next(new Error('UNAUTHENTICATED'))` — not `next()` — if the token is missing or invalid. Calling `next()` without an error grants access.
- **[REQUIRED]** `CLERK_SECRET_KEY` is read from `process.env` on the Socket.IO server. It is never logged, never sent to clients, never included in any response.
- **[REQUIRED]** Expired JWTs must be rejected. `verifyToken` from `@clerk/backend` checks expiry automatically — do not suppress this check.

#### 8.4 — Implement the Redis adapter
- **[REQUIRED]** Use the `rediss://` URL (TLS) from Upstash. Plain `redis://` (no TLS) is forbidden.
- **[REQUIRED]** Log Redis connection errors to `console.error`. A silent Redis failure means events may not propagate between server instances — this must be visible in logs.

#### 8.5 — Implement the presence store
- **[REQUIRED]** The presence store holds `{ userId, userName }` — never email addresses, JWTs, or any other PII beyond the display name.
- **[NOTE]** The presence store is in-memory. If the server restarts, presence state is cleared. Users will rejoin rooms on reconnect, which repopulates presence automatically.

#### 8.6 — Implement all event handlers
- **[REQUIRED]** Every broadcast event uses `socket.to(room).emit(...)` — not `io.to(room).emit(...)`. The difference: `socket.to()` excludes the sender; `io.to()` includes them. Broadcasting an event back to the sender causes the client to process its own event, leading to duplicate state updates.
- **[REQUIRED]** Event payloads from clients must contain only the minimum data needed to broadcast. The server must never use client-supplied `userId` from the event payload — it must always use `socket.data.userId` (set by the auth middleware from the verified JWT).

#### 8.7 — Implement rate limiting
- **[REQUIRED]** Rate limiting is applied to all broadcast event handlers without exception. No event type is exempt.
- **[REQUIRED]** The `RATE_LIMITED` event sent to the client must not include internal rate limit state (remaining count, reset time). Return only a message string.

#### 8.8 — Deploy to Render
- **[REQUIRED]** All environment variables in Render (`CLERK_SECRET_KEY`, `UPSTASH_REDIS_URL`, `ALLOWED_ORIGIN`) are set as "Secret" variables in Render — they do not appear in build logs.
- **[REQUIRED]** After deployment, verify the server logs show no errors and the CORS origin matches the frontend URL.
- **[REQUIRED]** Before finalizing: set `ALLOWED_ORIGIN` to the Vercel production URL (not localhost). Localhost must not be in the production CORS allowlist.

---

### Step 9: Real-Time Frontend Integration

#### 9.1 — Build the Socket.IO client singleton
- **[REQUIRED]** `autoConnect: false` — the socket must not connect automatically on import. It connects only after the Clerk JWT is available (from `SocketProvider`). Connecting before auth means the first connection attempt has no JWT and will be rejected.
- **[REQUIRED]** `NEXT_PUBLIC_SOCKET_URL` is safe to expose (it is a public server URL). Verify it is the Render HTTPS URL — never an HTTP URL in production.

#### 9.2 — Build the SocketProvider
- **[REQUIRED]** The socket connects with a fresh JWT fetched at connection time. Do not cache the JWT — always call `getToken()` to get the current token.
- **[REQUIRED]** On sign-out, call `disconnectSocket()` to close the WebSocket and clear the singleton. A signed-out user must not maintain an open connection.

#### 9.3 — Build the useBoardRoom hook
- **[REQUIRED]** All event listeners registered in `useBoardRoom` must be cleaned up in the hook's cleanup function (returned from `useEffect`). Leaking listeners causes events to be processed multiple times after component re-mounts.
- **[REQUIRED]** The `JOIN_BOARD` event must be emitted after the connection is confirmed (`socket.connected === true`). If the socket is not yet connected, wait for the `connect` event first.

#### 9.4 — Emit Socket.IO events from board mutations
- **[REQUIRED]** Socket.IO emissions are fire-and-forget. They must never be awaited for correctness — the Convex mutation is the source of truth. If the socket emission fails, the data is still persisted by Convex.
- **[NOTE]** The Socket.IO event payload should mirror the data returned by the Convex mutation — use the same field names and types to avoid client-side reconciliation bugs.

#### 9.5 — Add connection state banner
- **[REQUIRED]** When the socket disconnects, disable drag-and-drop (`DndContext disabled` prop). Allowing drag-and-drop while offline causes optimistic updates that cannot be confirmed, leading to ghost card positions.

---

### Step 10: Presence

#### 10.1 — Build the usePresence hook
- **[REQUIRED]** Presence data (`{ userId, userName }`) received from `PRESENCE_INIT` and `PRESENCE_UPDATE` events comes from the server's in-memory store, which was populated from verified JWTs. It is trustworthy. However, `avatarUrl` must be fetched from Convex (via `workspaceMembers` query) — not supplied by the Socket.IO server — because the server only holds display names, not avatar URLs.

#### 10.2 — Build the PresenceBar component
- **[REQUIRED]** Avatar images must be rendered with `referrerPolicy="no-referrer"` on the `<img>` element.
- **[NOTE]** The presence bar shows at most 5 avatars inline. There is no security concern with the overflow "+N" count.

---

### Step 11: Comments & @Mentions

#### 11.1 — Add @mention support to the comment editor
- **[REQUIRED]** The mention suggestion `items` function must only return workspace members fetched from Convex. It must not accept arbitrary user IDs from the client.
- **[REQUIRED]** The mention node stores `{ id: userId, label: userName }`. The `id` must be the Convex internal user ID — not the Clerk user ID, email, or any other identifier.

#### 11.2 — Wire @mention extraction in createComment
- **[REQUIRED]** The `extractMentionedUserIds` function must validate every extracted ID against workspace membership (as specified in section 5.8). A crafted JSON body could contain valid Convex IDs of users outside the workspace.
- **[REQUIRED]** Notifications are not created for the comment author themselves, even if they @mention themselves.
- **[REQUIRED]** Duplicate @mentions of the same user in one comment must result in only one notification.

#### 11.3 — Make comments real-time via Convex
- **[NOTE]** Convex reactive queries are the security-correct mechanism here. The subscription is to `api.comments.listByCard`, which enforces board read permission before returning comments.

#### 11.4 — Add edit and delete to CommentItem
- **[REQUIRED]** The edit and delete buttons are hidden in the UI for non-authors. The `updateComment` and `deleteComment` mutations enforce author-only access regardless of UI state.

---

### Step 12: Notifications

#### 12.1 — Implement the notification backend
- **[REQUIRED]** `list` query must filter by `userId: user._id`. It must never return another user's notifications.
- **[REQUIRED]** `markAsRead` must verify `notification.userId === user._id` before patching.

#### 12.2 — Build the NotificationBell component
- **[NOTE]** The unread count badge is a number. Render it as a React text node.

#### 12.3 — Build the NotificationList component
- **[REQUIRED]** Notification messages are constructed from stored metadata (actor name, card title). These strings are rendered as React text nodes — not HTML.
- **[REQUIRED]** When clicking a notification to navigate to a card, the navigation target must be constructed from the stored `boardId` and `cardId` — not from any URL stored in the notification record (which could be crafted for open redirect).

---

### Step 13: Board Chat & Typing Indicators

#### 13.1 — Implement the chat backend
- **[REQUIRED]** `sendChatMessage` must validate: body is non-empty string, `body.trim().length > 0`, length does not exceed 2,000 characters.
- **[REQUIRED]** `sendChatMessage` must call `assertBoardPermission(comment)` — view-only users cannot send chat messages.

#### 13.2 — Build the chat panel components
- **[REQUIRED]** Chat message bodies are rendered as React text nodes. They are never parsed as HTML or Markdown.

#### 13.3 — Implement typing indicators
- **[REQUIRED]** Typing indicators display only the user's name (from `socket.data.userName`). They never expose email or other PII.
- **[NOTE]** The 3-second auto-timeout on typing indicators prevents stale "X is typing..." messages from persisting if `TYPING_STOP` is missed due to a disconnection.

---

### Step 14: Activity Log

#### 14.1 — Verify activity log writes across all mutations
- **[REQUIRED]** Every mutation that changes board state must write an activity log entry. The audit trail must be complete.
- **[REQUIRED]** Activity log writes must not be skippable — do not wrap `writeActivityLog` in a try-catch that silently swallows errors.

#### 14.2 — Implement the activity log query
- **[REQUIRED]** `listByBoard` must call `assertBoardPermission(view)`. The activity log reveals all actions taken on the board — it is board-private data.
- **[REQUIRED]** The query joins actor information from the `users` table at query time. It does not store names in the log entry (names can change; IDs are permanent).

#### 14.3 — Build the activity log formatter
- **[REQUIRED]** All strings output by `formatActivityEntry` are used as React text node content. They are never injected as HTML.

#### 14.4 — Build the ActivityLogPanel component
- **[NOTE]** The "load more" pagination uses a cursor from Convex. Cursors are opaque identifiers generated by Convex — they are not user-constructable, so there is no cursor injection risk.

---

### Step 15: Permission Enforcement

#### 15.1 — Add permission helpers to the frontend
- **[NOTE]** `lib/permissions.ts` contains client-side helpers that determine what UI controls to show. These are convenience functions — the server enforces permissions independently. No security properties depend on these functions.

#### 15.2 — Gate drag-and-drop by permission
- **[REQUIRED]** Hiding drag handles is a UI convenience. The `moveCard` Convex mutation still calls `assertBoardPermission(edit)`. The UI gate can be bypassed by a motivated user — the server gate cannot.

#### 15.3 — Gate card mutation controls by permission
- **[NOTE]** Same principle as 15.2. All UI gates are for usability. Security is enforced server-side.

#### 15.4 — Handle server-side rejection in the UI
- **[REQUIRED]** `ConvexError` with code `FORBIDDEN` must always result in:
  1. Revert any optimistic UI changes
  2. Display a toast message to the user
  3. No silent failure — the user must know their action was rejected

---

### Step 16: Dark Mode & Mobile Responsiveness

#### 16.1 — Wire the dark mode toggle
- **[REQUIRED]** The theme preference is stored in `localStorage`. `localStorage` is accessible by any JavaScript running on the same origin — this is standard behavior. Do not store anything sensitive in `localStorage`. Theme preference is not sensitive.

#### 16.2 — Implement mobile column tab navigation
- **[NOTE]** No security concerns. Pure layout logic.

#### 16.3 — Implement mobile sidebar
- **[NOTE]** The mobile sidebar uses a `Sheet` component. Verify it uses a `DialogContent` with `aria-describedby` correctly — this prevents screen reader information leakage (not a security risk, but an accessibility requirement).

#### 16.4 — Implement mobile card modal and chat
- **[NOTE]** No security concerns beyond those already covered in Steps 6 and 13.

---

### Step 17: Edge Cases & Error Handling

#### 17.1 — Concurrent card edit correction
- **[REQUIRED]** When the Convex reactive query updates a card while the user has unsaved changes in the description editor, the editor content must not be silently overwritten. The user must be notified of the conflict. Silently discarding user input without notification violates user expectations.

#### 17.2 — Deleted card modal auto-close
- **[REQUIRED]** Both the Socket.IO `CARD_DELETED` event and the Convex reactive query returning `null` must trigger the modal close. Either signal alone is insufficient — the WebSocket may be down when the delete occurs.

#### 17.3 — WebSocket disconnect handling
- **[REQUIRED]** On reconnect, the client re-emits `JOIN_BOARD` with a fresh JWT (fetched from Clerk). Do not reuse the JWT from the initial connection — it may have expired during the disconnect.

#### 17.4 — @Mention of non-member
- **[REQUIRED]** Server-side validation in `createComment` confirms every @mentioned user ID is a workspace member before notifying them. This is the authoritative check. Client-side filtering is a UX aid only.

#### 17.5 — Removed member display
- **[REQUIRED]** Displaying "[Removed Member]" for a removed user's `assigneeId` must never expose their email or any PII. Only their last known display name (or the placeholder) is shown.

#### 17.6 — Invalid invite link error page
- **[REQUIRED]** The error message shown to the user for an expired or used invite link must not reveal whether the link was expired vs. never valid vs. already used. Use a single generic message to prevent enumeration of invite token states.

---

### Step 18: Deployment

#### 18.1 — Set up the GitHub repository
- **[REQUIRED]** Before the first push, run `git log --all --oneline` and `git diff HEAD` to confirm no credentials are in any commit.
- **[REQUIRED]** Run `grep -r "sk_test\|sk_live\|UPSTASH\|rediss://" --include="*.ts" --include="*.tsx" --include="*.json" .` to scan for accidentally committed secrets.

#### 18.2 — Deploy the Next.js app to Vercel
- **[REQUIRED]** Use the **Production** Clerk instance keys in Vercel — not the Development keys. Clerk Development instances have relaxed settings that are not appropriate for production.
- **[REQUIRED]** Set all environment variables in Vercel before the first deployment. A deployment that runs with missing env vars will start in a broken state.
- **[REQUIRED]** In Vercel → Settings → General → Root Directory: verify the root is correct (not `server/`).

#### 18.3 — Deploy Convex to production
- **[REQUIRED]** Run `npx convex deploy` (not `npx convex dev`) for the production deployment. `dev` mode is for local development only.
- **[REQUIRED]** Verify the production Convex deployment is configured with the production Clerk Issuer URL — not the development one.

#### 18.4 — Register the Clerk webhook for production
- **[REQUIRED]** The production webhook is registered in the **Production** Clerk instance — not the Development instance.
- **[REQUIRED]** The webhook secret for the production instance (`CLERK_WEBHOOK_SECRET` in Vercel) is different from the development instance secret. Update it.
- **[REQUIRED]** After registering, send a test event from the Clerk dashboard and verify the user record appears in the Convex production database.

#### 18.5 — Update Socket.IO CORS for production
- **[REQUIRED]** `ALLOWED_ORIGIN` in Render must be exactly the Vercel production URL: `https://onpoint.vercel.app` (or your actual URL). No trailing slash. No wildcard.
- **[REQUIRED]** After updating, test the Socket.IO connection from the live frontend. Verify no CORS errors appear in the browser console.

#### 18.6 — End-to-end demo smoke test
- **[REQUIRED]** Open the browser's developer console during the smoke test. Zero console errors and zero security warnings must be present on any page.
- **[REQUIRED]** Verify `Content-Security-Policy` headers are present in responses (Vercel adds these by default).
- **[REQUIRED]** Verify all network requests use HTTPS — no HTTP requests from the deployed app.

---

## 11. Pre-Deployment Security Checklist

Complete every item before marking Step 18 done. This is the final security gate.

### Secrets & Configuration
- [ ] `.env.local` is in `.gitignore` and has never been committed
- [ ] `server/.env` is in `.gitignore` and has never been committed
- [ ] No API keys, secrets, or credentials appear anywhere in committed source code
- [ ] `git log --all -S "sk_" --oneline` returns no results
- [ ] Development keys and production keys are separate (separate Clerk instances)
- [ ] All Vercel environment variables are set and verified
- [ ] All Render environment variables are set and verified

### Authentication
- [ ] Visiting any `/(app)/` route while logged out redirects to `/sign-in`
- [ ] `/onboarding` is accessible only to authenticated users
- [ ] Clerk webhook signature verification is active and tested
- [ ] `createUser` is an `internalMutation` — confirmed not callable from the browser console
- [ ] The Clerk Issuer URL is configured in the Convex production dashboard

### Authorization
- [ ] Calling `moveCard` as a view-only user returns `FORBIDDEN`
- [ ] Calling `updateCard` as a view-only user returns `FORBIDDEN`
- [ ] Calling `createColumn` as a view-only user returns `FORBIDDEN`
- [ ] Calling `deleteWorkspace` as an admin (not owner) returns `FORBIDDEN`
- [ ] A user in Workspace A cannot query boards from Workspace B using a known board ID

### Input Validation
- [ ] Submitting an empty card title is rejected (client + server)
- [ ] Submitting a card title over 255 characters is rejected by the Convex mutation
- [ ] Submitting a chat message over 2,000 characters is rejected
- [ ] An expired invite token is rejected with a generic error message
- [ ] A `moveCard` call with a `newColumnId` from a different board is rejected

### XSS
- [ ] No `dangerouslySetInnerHTML` calls with user-supplied string values exist in the codebase (`grep -r "dangerouslySetInnerHTML" src/` or `app/`)
- [ ] Card titles render as text nodes, not HTML
- [ ] Chat messages render as text nodes, not HTML
- [ ] Activity log entries render as text nodes, not HTML

### WebSocket Security
- [ ] Socket.IO CORS origin is set to the exact Vercel URL — not `"*"`
- [ ] A connection without a JWT token is rejected
- [ ] A connection with an expired JWT is rejected
- [ ] Rate limiting is active: sending 31 events in 10 seconds triggers `RATE_LIMITED`

### Data Integrity
- [ ] Deleting a column: no orphan cards, labels, or comments remain
- [ ] Deleting a card: no orphan labels, comments, history, or notifications remain
- [ ] Deleting a workspace: no orphan boards, columns, or cards remain
- [ ] The activity log has entries for every action taken during the smoke test
- [ ] No activity log entries have been deleted or modified

### Network & Transport
- [ ] All pages load over HTTPS — no HTTP resources
- [ ] Socket.IO server uses `rediss://` (TLS) for Upstash — confirmed in Render logs
- [ ] Browser console shows zero security warnings on the deployed app
