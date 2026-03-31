# Backend Plan (BP): OnPoint

**Version 1.0 | March 2026**
**References:** PRD.md (what to build) | TOOLS_AND_TECHNOLOGIES.md (how to build it)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Backend Architecture](#2-backend-architecture)
3. [Environment Variables](#3-environment-variables)
4. [Convex Schema](#4-convex-schema)
5. [Permission System](#5-permission-system)
6. [Convex Queries (All Reads)](#6-convex-queries-all-reads)
7. [Convex Mutations (All Writes)](#7-convex-mutations-all-writes)
8. [Clerk Webhook Handler](#8-clerk-webhook-handler)
9. [Activity Log System](#9-activity-log-system)
10. [Notification System](#10-notification-system)
11. [Socket.IO Server](#11-socketio-server)
12. [Redis Adapter (Upstash)](#12-redis-adapter-upstash)
13. [Rate Limiting](#13-rate-limiting)
14. [Edge Case Handling in the Backend](#14-edge-case-handling-in-the-backend)
15. [Complete Mutation-by-Mutation Checklist](#15-complete-mutation-by-mutation-checklist)

---

## 1. Overview

The backend of OnPoint consists of two separate systems that serve different purposes:

**Convex** — the persistent data layer and server-side logic layer. All application data lives in Convex. Every read and write is a TypeScript function (query or mutation) that runs on Convex's infrastructure. Convex enforces all business rules and permissions. It is the single source of truth.

**Socket.IO Server** — a standalone Node.js/TypeScript process hosted on Render. It handles low-latency, ephemeral real-time events (card moves, presence, typing indicators, chat messages). It does not own data — it only broadcasts events to board room members. Convex handles the actual data write.

These two systems work together: the frontend calls both simultaneously on every state-changing action — the Convex mutation persists the change, the Socket.IO emit propagates it instantly.

---

## 2. Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js (Vercel)                      │
│  ┌──────────────────┐    ┌────────────────────────────┐  │
│  │  Client Components│    │  API Route                  │  │
│  │  (useQuery,      │    │  /api/webhooks/clerk        │  │
│  │   useMutation)   │    │  (Clerk user.created sync)  │  │
│  └────────┬─────────┘    └───────────┬────────────────┘  │
└───────────┼───────────────────────────┼───────────────────┘
            │ Convex SDK                │ HTTP POST
            ▼                           ▼
┌───────────────────────┐   ┌──────────────────────────────┐
│   Convex              │   │  Clerk (External Service)    │
│  ┌─────────────────┐  │   │  - Auth / JWTs               │
│  │ Schema          │  │   │  - Webhooks (user.created)   │
│  │ Queries         │  │   └──────────────────────────────┘
│  │ Mutations       │◄─┼── Webhook calls createUser mutation
│  │ (Permission     │  │
│  │  checks built   │  │
│  │  into every     │  │
│  │  handler)       │  │
│  └─────────────────┘  │
└───────────────────────┘

            │ socket.emit() / socket.on()
            ▼
┌──────────────────────────────────────────────────────────┐
│   Socket.IO Server (Node.js on Render)                   │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Auth Middleware (verify Clerk JWT)              │    │
│  │  Board Rooms (in-memory, keyed by boardId)       │    │
│  │  Event Handlers (CARD_MOVED, PRESENCE, etc.)    │    │
│  │  Rate Limiter (Redis: events/user/second)        │    │
│  └────────────────────────┬─────────────────────────┘    │
└───────────────────────────┼──────────────────────────────┘
                            │ @socket.io/redis-adapter
                            ▼
┌──────────────────────────────────────────────────────────┐
│   Upstash Redis                                          │
│  - Pub/Sub for multi-instance broadcasting              │
│  - Rate limit counters (user:eventCount keys)           │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Environment Variables

### Convex (`convex/` — set via `npx convex env set`)

| Variable | Purpose |
|---|---|
| `CLERK_ISSUER_URL` | Clerk's issuer URL for JWT verification (set once in Convex dashboard) |
| `CLERK_WEBHOOK_SECRET` | Used by the Next.js API route — not needed inside Convex functions directly |

### Socket.IO Server (set as Render environment variables)

| Variable | Purpose |
|---|---|
| `CLERK_PUBLISHABLE_KEY` | Used by `@clerk/backend` to verify JWTs without calling Clerk's API |
| `UPSTASH_REDIS_URL` | Upstash Redis REST URL (format: `rediss://...`) |
| `UPSTASH_REDIS_TOKEN` | Upstash Redis auth token |
| `PORT` | Server port (Render sets this automatically) |
| `ALLOWED_ORIGIN` | The Vercel frontend URL for CORS configuration |

---

## 4. Convex Schema

**File:** `convex/schema.ts`

All tables are defined here with Convex's TypeScript validator syntax. Every table has an auto-generated `_id` (Convex ID) and `_creationTime` timestamp.

```ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({

  // ─── Users ──────────────────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),       // Clerk user ID (subject field from JWT)
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  })
  .index('by_clerk_id', ['clerkId'])
  .index('by_email', ['email']),

  // ─── Workspaces ─────────────────────────────────────────────────────────
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),          // URL-safe unique identifier, e.g. "my-team"
    ownerId: v.id('users'),
  })
  .index('by_slug', ['slug'])
  .index('by_owner', ['ownerId']),

  // ─── Workspace Members ──────────────────────────────────────────────────
  workspaceMembers: defineTable({
    workspaceId: v.id('workspaces'),
    userId: v.id('users'),
    role: v.union(
      v.literal('owner'),
      v.literal('admin'),
      v.literal('member'),
      v.literal('guest')
    ),
  })
  .index('by_workspace', ['workspaceId'])
  .index('by_user', ['userId'])
  .index('by_workspace_and_user', ['workspaceId', 'userId']),

  // ─── Workspace Invites ──────────────────────────────────────────────────
  workspaceInvites: defineTable({
    workspaceId: v.id('workspaces'),
    token: v.string(),         // Random UUID token embedded in invite link
    invitedEmail: v.optional(v.string()),  // Null for link-based invites
    role: v.union(
      v.literal('admin'),
      v.literal('member'),
      v.literal('guest')
    ),
    expiresAt: v.number(),     // Unix timestamp ms
    usedAt: v.optional(v.number()),
    createdBy: v.id('users'),
  })
  .index('by_token', ['token'])
  .index('by_workspace', ['workspaceId']),

  // ─── Boards ─────────────────────────────────────────────────────────────
  boards: defineTable({
    workspaceId: v.id('workspaces'),
    title: v.string(),
    visibility: v.union(v.literal('private'), v.literal('workspace')),
    createdBy: v.id('users'),
  })
  .index('by_workspace', ['workspaceId']),

  // ─── Board Members (permission overrides) ───────────────────────────────
  boardMembers: defineTable({
    boardId: v.id('boards'),
    userId: v.id('users'),
    permission: v.union(
      v.literal('edit'),
      v.literal('comment'),
      v.literal('view')
    ),
  })
  .index('by_board', ['boardId'])
  .index('by_board_and_user', ['boardId', 'userId']),

  // ─── Columns ────────────────────────────────────────────────────────────
  columns: defineTable({
    boardId: v.id('boards'),
    title: v.string(),
    orderIndex: v.number(),    // Gap strategy: 1000, 2000, 3000...
  })
  .index('by_board', ['boardId']),

  // ─── Cards ──────────────────────────────────────────────────────────────
  cards: defineTable({
    columnId: v.id('columns'),
    boardId: v.id('boards'),   // Denormalized for efficient board-level queries
    title: v.string(),
    description: v.optional(v.any()),   // Tiptap ProseMirror JSON
    assigneeId: v.optional(v.id('users')),
    dueDate: v.optional(v.string()),    // ISO date string, date only (no time)
    orderIndex: v.number(),
  })
  .index('by_column', ['columnId'])
  .index('by_board', ['boardId']),

  // ─── Card Labels ────────────────────────────────────────────────────────
  cardLabels: defineTable({
    cardId: v.id('cards'),
    label: v.string(),         // e.g. "Bug", "Feature", "Urgent"
    color: v.string(),         // Tailwind color token e.g. "red", "blue"
  })
  .index('by_card', ['cardId']),

  // ─── Comments ───────────────────────────────────────────────────────────
  comments: defineTable({
    cardId: v.id('cards'),
    boardId: v.id('boards'),   // Denormalized for permission checks
    authorId: v.id('users'),
    body: v.any(),             // Tiptap JSON — contains mention nodes
    editedAt: v.optional(v.number()),
  })
  .index('by_card', ['cardId']),

  // ─── Activity Log ────────────────────────────────────────────────────────
  activityLogs: defineTable({
    boardId: v.id('boards'),
    actorId: v.id('users'),
    actionType: v.string(),    // e.g. "CARD_MOVED", "CARD_UPDATED", "COMMENT_ADDED"
    entityType: v.string(),    // e.g. "card", "column", "comment"
    entityId: v.string(),      // The Convex ID of the affected entity (stored as string)
    metadata: v.any(),         // JSON: previous/new values, from/to columns, etc.
  })
  .index('by_board', ['boardId'])
  .index('by_board_and_actor', ['boardId', 'actorId'])
  .index('by_board_and_action', ['boardId', 'actionType']),

  // ─── Notifications ───────────────────────────────────────────────────────
  notifications: defineTable({
    userId: v.id('users'),     // Recipient
    type: v.union(
      v.literal('ASSIGNED'),
      v.literal('MENTIONED')
    ),
    cardId: v.id('cards'),
    boardId: v.id('boards'),
    actorId: v.id('users'),    // Who triggered the notification
    isRead: v.boolean(),
  })
  .index('by_user', ['userId'])
  .index('by_user_and_read', ['userId', 'isRead']),

  // ─── Chat Messages ───────────────────────────────────────────────────────
  chatMessages: defineTable({
    boardId: v.id('boards'),
    userId: v.id('users'),
    body: v.string(),          // Plain text (no rich text in chat)
  })
  .index('by_board', ['boardId']),

  // ─── Card History ─────────────────────────────────────────────────────────
  cardHistory: defineTable({
    cardId: v.id('cards'),
    actorId: v.id('users'),
    field: v.string(),         // "title" or "description"
    previousValue: v.any(),    // The value before this change
    newValue: v.any(),         // The value after this change
  })
  .index('by_card', ['cardId']),

})
```

---

## 5. Permission System

Every Convex mutation and query that touches board data calls one of these two helpers before reading or writing. **No exceptions.**

### 5.1 Core Permission Logic

**File:** `convex/lib/permissions.ts`

```ts
import { MutationCtx, QueryCtx } from '../_generated/server'
import { Id } from '../_generated/dataModel'

// Resolve the effective permission for a user on a board.
// Priority: board-level override > workspace role mapping
export async function getEffectiveBoardPermission(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<'boards'>,
  userId: Id<'users'>
): Promise<'edit' | 'comment' | 'view' | null> {

  // 1. Check board-level override
  const boardMember = await ctx.db
    .query('boardMembers')
    .withIndex('by_board_and_user', q =>
      q.eq('boardId', boardId).eq('userId', userId)
    )
    .unique()

  if (boardMember) return boardMember.permission

  // 2. Fall back to workspace role
  const board = await ctx.db.get(boardId)
  if (!board) return null

  // Private boards: only explicit board members
  if (board.visibility === 'private') return null

  // Workspace boards: use workspace role as default
  const wsMember = await ctx.db
    .query('workspaceMembers')
    .withIndex('by_workspace_and_user', q =>
      q.eq('workspaceId', board.workspaceId).eq('userId', userId)
    )
    .unique()

  if (!wsMember) return null

  // Map workspace role → board permission
  const roleMap: Record<string, 'edit' | 'comment' | 'view'> = {
    owner: 'edit',
    admin: 'edit',
    member: 'edit',
    guest: 'view',
  }
  return roleMap[wsMember.role] ?? 'view'
}

// Throws ConvexError if the user does not have the required permission.
export async function assertBoardPermission(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<'boards'>,
  userId: Id<'users'>,
  required: 'edit' | 'comment' | 'view'
): Promise<void> {
  const perm = await getEffectiveBoardPermission(ctx, boardId, userId)
  const permRank = { edit: 3, comment: 2, view: 1 }
  if (!perm || permRank[perm] < permRank[required]) {
    throw new ConvexError({ code: 'FORBIDDEN', message: 'Insufficient permission' })
  }
}
```

### 5.2 Identity Resolution Helper

**File:** `convex/lib/auth.ts`

```ts
// Called at the start of every authenticated mutation/query.
// Returns the internal user record or throws if not found.
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError({ code: 'UNAUTHENTICATED' })

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
    .unique()

  if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' })
  return user
}
```

### 5.3 Workspace Role Checks

Some operations require workspace-level role checks (not board-level), e.g., creating a board, inviting members.

```ts
export async function assertWorkspaceRole(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<'workspaces'>,
  userId: Id<'users'>,
  required: 'owner' | 'admin' | 'member'
): Promise<void> {
  const member = await ctx.db
    .query('workspaceMembers')
    .withIndex('by_workspace_and_user', q =>
      q.eq('workspaceId', workspaceId).eq('userId', userId)
    )
    .unique()

  const roleRank = { owner: 4, admin: 3, member: 2, guest: 1 }
  if (!member || roleRank[member.role] < roleRank[required]) {
    throw new ConvexError({ code: 'FORBIDDEN', message: 'Insufficient workspace role' })
  }
}
```

---

## 6. Convex Queries (All Reads)

Queries are read-only Convex functions. They return data and maintain live subscriptions for connected clients.

### 6.1 User Queries (`convex/users.ts`)

| Query | Args | Returns | Auth |
|---|---|---|---|
| `getMe` | — | Current user record | requireUser |
| `getById` | `{ userId }` | User record | requireUser |

### 6.2 Workspace Queries (`convex/workspaces.ts`)

| Query | Args | Returns | Auth |
|---|---|---|---|
| `listMyWorkspaces` | — | All workspaces the caller belongs to | requireUser |
| `getBySlug` | `{ slug }` | Single workspace + caller's role | requireUser + membership check |
| `listMembers` | `{ workspaceId }` | All members with roles | requireUser + workspace membership |

### 6.3 Board Queries (`convex/boards.ts`)

| Query | Args | Returns | Auth |
|---|---|---|---|
| `listByWorkspace` | `{ workspaceId }` | All boards visible to the caller | requireUser + filters by visibility |
| `get` | `{ boardId }` | Single board | requireUser + assertBoardPermission(view) |
| `getMembers` | `{ boardId }` | Board member overrides + effective permissions | requireUser + assertBoardPermission(view) |

### 6.4 Column Queries (`convex/columns.ts`)

| Query | Args | Returns | Auth |
|---|---|---|---|
| `listByBoard` | `{ boardId }` | All columns ordered by `orderIndex` | requireUser + assertBoardPermission(view) |

### 6.5 Card Queries (`convex/cards.ts`)

| Query | Args | Returns | Auth |
|---|---|---|---|
| `listByBoard` | `{ boardId }` | All cards across all columns (flat list with columnId) | requireUser + assertBoardPermission(view) |
| `get` | `{ cardId }` | Single card with labels | requireUser + assertBoardPermission(view) |
| `getHistory` | `{ cardId }` | All cardHistory entries for this card, newest first | requireUser + assertBoardPermission(view) |

### 6.6 Comment Queries (`convex/comments.ts`)

| Query | Args | Returns | Auth |
|---|---|---|---|
| `listByCard` | `{ cardId }` | All comments for a card, oldest first + author name/avatar | requireUser + assertBoardPermission(view) |

### 6.7 Activity Log Queries (`convex/activityLogs.ts`)

| Query | Args | Returns | Auth |
|---|---|---|---|
| `listByBoard` | `{ boardId, actionType?, actorId?, cursor? }` | Paginated log entries with actor name/avatar, newest first | requireUser + assertBoardPermission(view) |

Activity log query uses Convex's `.paginate()` API. Each page returns 20 entries. The `cursor` argument enables infinite scroll.

### 6.8 Notification Queries (`convex/notifications.ts`)

| Query | Args | Returns | Auth |
|---|---|---|---|
| `list` | — | All notifications for current user, newest first (max 50) | requireUser |
| `getUnreadCount` | — | Count of unread notifications | requireUser |

### 6.9 Chat Queries (`convex/chat.ts`)

| Query | Args | Returns | Auth |
|---|---|---|---|
| `listByBoard` | `{ boardId }` | Last 100 chat messages with sender name/avatar | requireUser + assertBoardPermission(view) |

### 6.10 Workspace Member Queries (used for @mention suggestions)

`workspaceMembers.list` returns all members with their names — used by the Tiptap Mention extension to populate the @mention dropdown.

---

## 7. Convex Mutations (All Writes)

Every mutation follows this pattern:
1. `requireUser` — get the caller's internal user record
2. Permission check — `assertBoardPermission` or `assertWorkspaceRole`
3. Input validation — validate IDs exist, strings are non-empty
4. Write data — `ctx.db.insert`, `ctx.db.patch`, `ctx.db.delete`
5. Write activity log — `writeActivityLog(ctx, ...)` (see section 9)
6. Create notifications — if applicable (see section 10)

### 7.1 User Mutations (`convex/users.ts`)

#### `createUser`
Called only by the Clerk webhook handler. Not callable by clients.
```
Args: { clerkId, email, name, avatarUrl? }
- Check: user with this clerkId does not already exist
- Insert: users table
- No activity log (not a board action)
```

### 7.2 Workspace Mutations (`convex/workspaces.ts`)

#### `createWorkspace`
```
Args: { name }
- requireUser
- Generate slug: slugify(name), check uniqueness, append suffix if taken
- Insert: workspaces table (owner = caller)
- Insert: workspaceMembers table (caller = owner role)
```

#### `updateWorkspaceName`
```
Args: { workspaceId, name }
- requireUser
- assertWorkspaceRole(admin)
- Patch: workspaces.name
```

#### `deleteWorkspace`
```
Args: { workspaceId }
- requireUser
- assertWorkspaceRole(owner) — only owner can delete
- Cascade delete: all boards, columns, cards, labels, comments, activity logs, notifications, chat messages, members, invites for this workspace
```

#### `createInvite`
```
Args: { workspaceId, role, invitedEmail? }
- requireUser
- assertWorkspaceRole(admin)
- Generate token: crypto.randomUUID()
- Set expiresAt: now + 7 days (in ms)
- Insert: workspaceInvites table
- Return the full invite link (constructed from NEXT_PUBLIC_APP_URL + token)
```

#### `acceptInvite`
```
Args: { token }
- requireUser
- Query workspaceInvites by token
- Validate: not expired (expiresAt > now), not already used (usedAt is null)
  - If invalid: throw ConvexError({ code: 'INVITE_EXPIRED' })
- Check: user not already a member of this workspace
- Insert: workspaceMembers (workspaceId, userId, role from invite)
- Patch: workspaceInvites.usedAt = now
```

#### `updateMemberRole`
```
Args: { workspaceId, targetUserId, newRole }
- requireUser
- assertWorkspaceRole(admin)
- Cannot change own role
- Cannot change the owner's role unless caller is owner (owner transfer)
- Patch: workspaceMembers.role
```

#### `removeMember`
```
Args: { workspaceId, targetUserId }
- requireUser
- assertWorkspaceRole(admin)
- Cannot remove the workspace owner
- Delete: workspaceMembers row
- Delete: all boardMembers rows for this user in this workspace's boards
```

#### `transferOwnership`
```
Args: { workspaceId, newOwnerId }
- requireUser
- Must be current owner (role === 'owner')
- Patch: workspaces.ownerId = newOwnerId
- Patch: workspaceMembers for newOwner: role = 'owner'
- Patch: workspaceMembers for caller: role = 'admin'
```

### 7.3 Board Mutations (`convex/boards.ts`)

#### `createBoard`
```
Args: { workspaceId, title, visibility }
- requireUser
- assertWorkspaceRole(member) — guests cannot create boards
- Insert: boards table
- Write activity log: BOARD_CREATED (board-level, so boardId = new board's ID)
```

#### `updateBoard`
```
Args: { boardId, title?, visibility? }
- requireUser
- assertBoardPermission(edit) — only edit-level users can rename or change visibility
- Patch: boards table (only provided fields)
```

#### `deleteBoard`
```
Args: { boardId }
- requireUser
- assertWorkspaceRole(admin) for the board's workspace
- Cascade delete: all columns, cards, labels, comments, activity logs, chat messages, boardMembers for this board
```

#### `setBoardMemberPermission`
```
Args: { boardId, targetUserId, permission }
- requireUser
- assertWorkspaceRole(admin)
- Upsert: boardMembers (delete existing row if present, insert new)
```

### 7.4 Column Mutations (`convex/columns.ts`)

#### `createColumn`
```
Args: { boardId, title }
- requireUser
- assertBoardPermission(edit)
- Compute orderIndex: query max orderIndex for this board, add 1000
- Insert: columns table
- Write activity log: COLUMN_CREATED
```

#### `updateColumn`
```
Args: { columnId, title }
- requireUser
- Fetch column → get boardId
- assertBoardPermission(edit)
- Patch: columns.title
- Write activity log: COLUMN_UPDATED
```

#### `deleteColumn`
```
Args: { columnId }
- requireUser
- Fetch column → get boardId
- assertBoardPermission(edit)
- Query all cards in this column
- Delete: all cardLabels for each card
- Delete: all comments for each card
- Delete: all cardHistory for each card
- Delete: all cards
- Delete: the column
- Write activity log: COLUMN_DELETED with metadata { cardCount }
```

#### `reorderColumn`
```
Args: { columnId, newOrderIndex }
- requireUser
- Fetch column → get boardId
- assertBoardPermission(edit)
- Patch: columns.orderIndex
- If gap < 10 between any neighbors: trigger reindex (see section 14.2)
```

### 7.5 Card Mutations (`convex/cards.ts`)

#### `createCard`
```
Args: { columnId, title }
- requireUser
- Fetch column → get boardId
- assertBoardPermission(edit)
- Compute orderIndex: max orderIndex in this column + 1000
- Insert: cards table (with boardId denormalized)
- Write activity log: CARD_CREATED
```

#### `updateCard`
```
Args: { cardId, title?, description?, assigneeId?, dueDate? }
- requireUser
- Fetch card → get boardId
- assertBoardPermission(edit)
- For each changed field:
  - Write cardHistory entry: { cardId, actorId, field, previousValue, newValue }
- Patch: cards table (only provided fields)
- Write activity log: CARD_UPDATED with metadata { changedFields }
- If assigneeId changed and new assignee exists:
  - Create notification: ASSIGNED (see section 10)
```

#### `moveCard`
```
Args: { cardId, newColumnId, newOrderIndex }
- requireUser
- Fetch card → get boardId; record fromColumnId
- assertBoardPermission(edit)
- Patch: cards { columnId: newColumnId, orderIndex: newOrderIndex }
- Write activity log: CARD_MOVED with metadata { fromColumnId, toColumnId: newColumnId }
- If gap < 10 between neighbors in target column: trigger reindex
```

#### `deleteCard`
```
Args: { cardId }
- requireUser
- Fetch card → get boardId
- assertBoardPermission(edit)
- Delete: cardLabels for this card
- Delete: comments for this card
- Delete: cardHistory for this card
- Delete: notifications referencing this card
- Delete: the card
- Write activity log: CARD_DELETED with metadata { title }
```

#### `setCardLabels`
```
Args: { cardId, labels: Array<{ label, color }> }
- requireUser
- Fetch card → get boardId
- assertBoardPermission(edit)
- Delete: all existing cardLabels for this card
- Insert: new cardLabels records
- Write activity log: CARD_UPDATED with metadata { field: 'labels' }
```

#### `reindexColumnCards`
```
Args: { columnId }
- requireUser (internal action, triggered automatically)
- assertBoardPermission(edit)
- Query all cards in column, ordered by current orderIndex
- Reassign orderIndex: 1000, 2000, 3000... in order
- Batch patch all cards
```

### 7.6 Comment Mutations (`convex/comments.ts`)

#### `createComment`
```
Args: { cardId, body: TiptapJSON }
- requireUser
- Fetch card → get boardId
- assertBoardPermission(comment) — comment OR edit permission required
- Insert: comments table
- Write activity log: COMMENT_ADDED
- Extract @mentions from body JSON:
  - Walk JSON tree, collect all nodes of type "mention"
  - For each mention node with a valid userId:
    - If userId ≠ caller: createNotification(MENTIONED, ...)
```

#### `updateComment`
```
Args: { commentId, body: TiptapJSON }
- requireUser
- Fetch comment → get boardId
- assertBoardPermission(comment)
- Caller must be comment author (throw FORBIDDEN if not)
- Patch: comments { body, editedAt: now }
```

#### `deleteComment`
```
Args: { commentId }
- requireUser
- Fetch comment → get boardId
- assertBoardPermission(comment) for the board
- Caller must be comment author OR have 'edit' board permission
- Delete: the comment
```

### 7.7 Chat Mutations (`convex/chat.ts`)

#### `sendChatMessage`
```
Args: { boardId, body: string }
- requireUser
- assertBoardPermission(comment)
- Validate: body is non-empty, max 2000 characters
- Insert: chatMessages table
```

### 7.8 Notification Mutations (`convex/notifications.ts`)

#### `markAsRead`
```
Args: { notificationId }
- requireUser
- Verify notification.userId === caller._id
- Patch: notifications.isRead = true
```

#### `markAllAsRead`
```
Args: —
- requireUser
- Query all unread notifications for caller
- Batch patch: isRead = true
```

---

## 8. Clerk Webhook Handler

**File:** `app/api/webhooks/clerk/route.ts`

This is a Next.js API Route. It receives HTTP POST requests from Clerk when user events occur.

### Supported Events

| Clerk Event | Action |
|---|---|
| `user.created` | Call `createUser` Convex mutation |
| `user.updated` | Patch the user's name and avatarUrl in Convex |

### Implementation

```ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!

  // Verify the webhook signature using svix
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  const body = await req.text()
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id!,
      'svix-timestamp': svix_timestamp!,
      'svix-signature': svix_signature!,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    await fetchMutation(api.users.createUser, {
      clerkId: id,
      email: email_addresses[0].email_address,
      name: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
      avatarUrl: image_url,
    })
  }

  if (evt.type === 'user.updated') {
    const { id, first_name, last_name, image_url } = evt.data
    await fetchMutation(api.users.updateUser, {
      clerkId: id,
      name: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
      avatarUrl: image_url,
    })
  }

  return new Response('OK', { status: 200 })
}
```

**Security:** The `svix` library verifies the `svix-signature` header against `CLERK_WEBHOOK_SECRET`. Any request with an invalid signature returns 400 immediately. This prevents anyone from spoofing webhook events.

---

## 9. Activity Log System

The activity log is the append-only audit trail of every state change on a board.

### 9.1 Write Helper

**File:** `convex/lib/activityLog.ts`

```ts
export async function writeActivityLog(
  ctx: MutationCtx,
  params: {
    boardId: Id<'boards'>
    actorId: Id<'users'>
    actionType: string
    entityType: string
    entityId: string
    metadata?: Record<string, unknown>
  }
) {
  await ctx.db.insert('activityLogs', {
    boardId: params.boardId,
    actorId: params.actorId,
    actionType: params.actionType,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata ?? {},
  })
}
```

### 9.2 Action Types and Metadata

Every action type corresponds to a specific set of metadata fields. The frontend's `formatActivityEntry.ts` uses these to render human-readable strings.

| actionType | entityType | Metadata fields | Example render |
|---|---|---|---|
| `CARD_CREATED` | `card` | `{ title }` | "Punit created card 'Auth flow'" |
| `CARD_UPDATED` | `card` | `{ changedFields: string[] }` | "Punit updated 'Auth flow'" |
| `CARD_MOVED` | `card` | `{ title, fromColumnTitle, toColumnTitle }` | "Punit moved 'Auth flow' from To Do to In Progress" |
| `CARD_DELETED` | `card` | `{ title }` | "Punit deleted card 'Auth flow'" |
| `COLUMN_CREATED` | `column` | `{ title }` | "Punit created column 'Backlog'" |
| `COLUMN_UPDATED` | `column` | `{ previousTitle, newTitle }` | "Punit renamed 'Backlog' to 'Todo'" |
| `COLUMN_DELETED` | `column` | `{ title, cardCount }` | "Punit deleted column 'Backlog' (3 cards)" |
| `COMMENT_ADDED` | `comment` | `{ cardTitle }` | "Aryan commented on 'Auth flow'" |
| `CARD_ASSIGNED` | `card` | `{ cardTitle, assigneeName }` | "Neha was assigned to 'API rate limiting'" |

### 9.3 Immutability Guarantee

Activity log entries have no `delete` mutation and no `update` mutation. Once written, a log entry is permanent. The Convex schema has no way to modify them except via the `ctx.db.delete` API, which is deliberately not exposed.

---

## 10. Notification System

### 10.1 Write Helper

**File:** `convex/lib/notifications.ts`

```ts
export async function createNotification(
  ctx: MutationCtx,
  params: {
    userId: Id<'users'>     // recipient
    type: 'ASSIGNED' | 'MENTIONED'
    cardId: Id<'cards'>
    boardId: Id<'boards'>
    actorId: Id<'users'>    // who triggered it
  }
) {
  // Do not notify if actor === recipient (don't notify yourself)
  if (params.userId === params.actorId) return

  await ctx.db.insert('notifications', {
    userId: params.userId,
    type: params.type,
    cardId: params.cardId,
    boardId: params.boardId,
    actorId: params.actorId,
    isRead: false,
  })
}
```

### 10.2 Where Notifications Are Created

| Trigger | Where in backend | Type |
|---|---|---|
| Card assignee set | Inside `updateCard` mutation, after patching assigneeId | `ASSIGNED` |
| @mention in comment | Inside `createComment` mutation, after scanning mention nodes in body JSON | `MENTIONED` |

### 10.3 Real-Time Delivery

Notifications are written to the `notifications` table. The frontend's `useQuery(api.notifications.list)` is a Convex reactive query — it automatically re-executes whenever a new notification is inserted. The notification bell badge updates without any Socket.IO event needed.

---

## 11. Socket.IO Server

**Location:** Separate repository (or `server/` folder) — deployed independently to Render.
**Entry point:** `server/index.ts`

### 11.1 Server Setup

```ts
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import { verifyToken } from '@clerk/backend'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true,
  },
})

// Redis adapter (see section 12)
setupRedisAdapter(io)

// Auth middleware (see section 11.2)
io.use(authMiddleware)

// Event handlers (see section 11.3)
io.on('connection', handleConnection)

httpServer.listen(process.env.PORT ?? 3001)
```

### 11.2 Auth Middleware

Every new Socket.IO connection passes through this middleware before any event handlers run.

```ts
async function authMiddleware(socket, next) {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('UNAUTHENTICATED'))

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    // Attach verified identity to socket for use in handlers
    socket.data.userId = payload.sub        // Clerk user ID
    socket.data.userName = payload.name     // Display name from JWT claims
    next()
  } catch {
    next(new Error('INVALID_TOKEN'))
  }
}
```

If the token is expired (user was idle for a long time), the client receives a connection error and must reconnect with a fresh token. The Socket.IO client in `SocketProvider.tsx` handles this by re-fetching a Clerk JWT and reconnecting.

### 11.3 Connection Handler

```ts
function handleConnection(socket: Socket) {

  // ─── Board Room Events ───────────────────────────────────────────

  socket.on('JOIN_BOARD', ({ boardId }) => {
    socket.join(`board:${boardId}`)
    socket.data.currentBoardId = boardId

    // Add to presence
    addToPresence(boardId, socket.data.userId, socket.data.userName)

    // Send current presence list to the joining user
    const currentPresence = getPresence(boardId)
    socket.emit('PRESENCE_INIT', currentPresence)

    // Notify others
    socket.to(`board:${boardId}`).emit('PRESENCE_UPDATE', {
      type: 'JOIN',
      userId: socket.data.userId,
      userName: socket.data.userName,
    })
  })

  socket.on('LEAVE_BOARD', ({ boardId }) => {
    handleLeaveBoard(socket, boardId)
  })

  socket.on('disconnect', () => {
    const boardId = socket.data.currentBoardId
    if (boardId) handleLeaveBoard(socket, boardId)
  })

  // ─── Card Events ─────────────────────────────────────────────────

  socket.on('CARD_CREATED', (payload) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('CARD_CREATED', payload)
    })
  })

  socket.on('CARD_UPDATED', (payload) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('CARD_UPDATED', payload)
    })
  })

  socket.on('CARD_MOVED', (payload) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('CARD_MOVED', payload)
    })
  })

  socket.on('CARD_DELETED', (payload) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('CARD_DELETED', payload)
    })
  })

  // ─── Column Events ───────────────────────────────────────────────

  socket.on('COLUMN_CREATED', (payload) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('COLUMN_CREATED', payload)
    })
  })

  socket.on('COLUMN_UPDATED', (payload) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('COLUMN_UPDATED', payload)
    })
  })

  socket.on('COLUMN_DELETED', (payload) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('COLUMN_DELETED', payload)
    })
  })

  // ─── Chat Events ─────────────────────────────────────────────────

  socket.on('TYPING_START', ({ boardId }) => {
    socket.to(`board:${boardId}`).emit('TYPING_START', {
      userId: socket.data.userId,
      userName: socket.data.userName,
    })
  })

  socket.on('TYPING_STOP', ({ boardId }) => {
    socket.to(`board:${boardId}`).emit('TYPING_STOP', {
      userId: socket.data.userId,
    })
  })

  // Chat messages are persisted via Convex, not Socket.IO
  // Socket.IO only broadcasts the "a new message was sent" signal
  socket.on('CHAT_MESSAGE_SENT', ({ boardId }) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${boardId}`).emit('CHAT_MESSAGE_SENT', {
        boardId,
        sentBy: socket.data.userId,
      })
      // The client refetches via Convex reactive query on receiving this event
    })
  })
}
```

### 11.4 Presence Store

Presence is stored in memory on the Socket.IO server. For a single-instance server, this is a `Map`. For multi-instance (with Redis adapter), the presence state must also be stored in Redis.

```ts
// Simple in-memory presence for single instance:
const presenceStore = new Map<string, Map<string, { userName: string }>>()
// Key: boardId → Map<userId, { userName }>

function addToPresence(boardId: string, userId: string, userName: string) {
  if (!presenceStore.has(boardId)) presenceStore.set(boardId, new Map())
  presenceStore.get(boardId)!.set(userId, { userName })
}

function removeFromPresence(boardId: string, userId: string) {
  presenceStore.get(boardId)?.delete(userId)
  if (presenceStore.get(boardId)?.size === 0) presenceStore.delete(boardId)
}

function getPresence(boardId: string) {
  const board = presenceStore.get(boardId)
  if (!board) return []
  return Array.from(board.entries()).map(([userId, data]) => ({
    userId,
    userName: data.userName,
  }))
}
```

```ts
function handleLeaveBoard(socket: Socket, boardId: string) {
  socket.leave(`board:${boardId}`)
  removeFromPresence(boardId, socket.data.userId)
  socket.to(`board:${boardId}`).emit('PRESENCE_UPDATE', {
    type: 'LEAVE',
    userId: socket.data.userId,
  })
}
```

---

## 12. Redis Adapter (Upstash)

**Purpose:** Enables pub/sub across multiple Socket.IO server instances. Even with one instance, setting this up correctly demonstrates horizontal scalability.

**File:** `server/redis.ts`

```ts
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'

export function setupRedisAdapter(io: Server) {
  const pubClient = new Redis(process.env.UPSTASH_REDIS_URL!, {
    tls: { rejectUnauthorized: false },
  })
  const subClient = pubClient.duplicate()

  pubClient.on('error', (err) => console.error('Redis pub error:', err))
  subClient.on('error', (err) => console.error('Redis sub error:', err))

  io.adapter(createAdapter(pubClient, subClient))
}
```

**Upstash-specific note:** Upstash Redis uses TLS and requires `rediss://` URLs (note the double `s`). The `ioredis` client handles this automatically when the URL uses the `rediss://` scheme.

---

## 13. Rate Limiting

Rate limiting prevents a single user from flooding the WebSocket server with events.

**Implementation:** Each user is allowed a maximum of 30 events per 10-second window. A Redis key tracks their count.

**File:** `server/rateLimit.ts`

```ts
import Redis from 'ioredis'

const redis = new Redis(process.env.UPSTASH_REDIS_URL!)

export async function checkRateLimit(
  userId: string,
  callback: () => void,
  onLimited: () => void
) {
  const key = `ratelimit:${userId}`
  const count = await redis.incr(key)

  if (count === 1) {
    // First event in window: set expiry
    await redis.expire(key, 10)
  }

  if (count > 30) {
    onLimited()
    return
  }

  callback()
}
```

In the connection handler, `checkRateLimit` wraps all broadcast events:
```ts
// Usage in event handlers:
checkRateLimit(
  socket.data.userId,
  () => socket.to(`board:${boardId}`).emit('CARD_MOVED', payload),
  () => socket.emit('RATE_LIMITED', { message: 'Too many events. Slow down.' })
)
```

---

## 14. Edge Case Handling in the Backend

### 14.1 Concurrent Card Edits (PRD 9.1)

Convex mutations are serialized per Convex deployment — no two mutations execute simultaneously for the same database. This means concurrent writes are naturally handled: the last mutation to complete wins.

Both writes are captured in `cardHistory` (since `updateCard` writes a history entry for each field changed). Both entries are readable in the History tab.

### 14.2 Order Index Gaps Running Out (PRD 9.2)

When `moveCard` or `createCard` computes a new `orderIndex`, it checks if the gap between neighbors is less than 10. If so, it calls `reindexColumnCards` as part of the same mutation:

```ts
// Inside moveCard, after patching the card:
const cards = await ctx.db
  .query('cards')
  .withIndex('by_column', q => q.eq('columnId', newColumnId))
  .order('asc') // by orderIndex
  .collect()

const minGap = cards.reduce((min, card, i) => {
  if (i === 0) return min
  return Math.min(min, card.orderIndex - cards[i-1].orderIndex)
}, Infinity)

if (minGap < 10) {
  // Reindex: assign 1000, 2000, 3000...
  for (let i = 0; i < cards.length; i++) {
    await ctx.db.patch(cards[i]._id, { orderIndex: (i + 1) * 1000 })
  }
}
```

### 14.3 Deleting a Column with Cards (PRD 9.4)

`deleteColumn` returns the count of deleted cards in its response so the frontend can display the correct count in the confirmation dialog before the delete is called. The frontend calls a query first:

```ts
// convex/columns.ts
export const getWithCardCount = query({
  args: { columnId: v.id('columns') },
  handler: async (ctx, { columnId }) => {
    const column = await ctx.db.get(columnId)
    const cardCount = await ctx.db
      .query('cards')
      .withIndex('by_column', q => q.eq('columnId', columnId))
      .collect()
      .then(cards => cards.length)
    return { ...column, cardCount }
  }
})
```

### 14.4 User Removed from Workspace (PRD 9.9)

When `removeMember` fires:
- The user's `workspaceMembers` row is deleted
- All their `boardMembers` rows in this workspace are deleted
- They will fail `assertWorkspaceRole` and `assertBoardPermission` on all future requests
- Cards assigned to them retain the `assigneeId` — the frontend detects this user is no longer in `workspaceMembers.list` and displays "[Removed Member]"

### 14.5 Duplicate Workspace Slug (PRD 9.7)

```ts
// Inside createWorkspace mutation:
async function generateUniqueSlug(ctx, baseName: string): Promise<string> {
  let slug = slugify(baseName)
  let suffix = 0

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`
    const existing = await ctx.db
      .query('workspaces')
      .withIndex('by_slug', q => q.eq('slug', candidate))
      .unique()
    if (!existing) return candidate
    suffix++
  }
}
```

### 14.6 Card Deleted While Open in Another Session (PRD 9.10)

When `deleteCard` is called:
1. The card is deleted from Convex
2. The frontend emits `CARD_DELETED` via Socket.IO
3. Any user whose `openCardId` matches the deleted card closes the modal (handled in `useBoardRoom`)
4. Convex reactive query `api.cards.get({ cardId })` returns `null` → the frontend detects this and closes the modal as a secondary fallback

### 14.7 @Mention of Non-Member (PRD 9.8)

The `createComment` mutation scans the Tiptap JSON body for mention nodes:
```ts
function extractMentionedUserIds(body: TiptapJSON): string[] {
  const ids: string[] = []
  function walk(node: TiptapNode) {
    if (node.type === 'mention' && node.attrs?.id) ids.push(node.attrs.id)
    node.content?.forEach(walk)
  }
  walk(body)
  return [...new Set(ids)] // deduplicate
}
```

For each extracted ID, the mutation verifies the user is actually a workspace member before creating a notification. Non-members are silently ignored.

---

## 15. Complete Mutation-by-Mutation Checklist

### Users
- [ ] `createUser` — called by Clerk webhook
- [ ] `updateUser` — called by Clerk webhook on profile update

### Workspaces
- [ ] `createWorkspace` — with slug generation and uniqueness check
- [ ] `updateWorkspaceName`
- [ ] `deleteWorkspace` — with full cascade
- [ ] `createInvite` — email or link-based, 7-day expiry
- [ ] `acceptInvite` — validates token, creates membership
- [ ] `updateMemberRole`
- [ ] `removeMember` — cleans up board memberships too
- [ ] `transferOwnership`

### Boards
- [ ] `createBoard`
- [ ] `updateBoard` — rename, visibility
- [ ] `deleteBoard` — full cascade
- [ ] `setBoardMemberPermission` — upsert

### Columns
- [ ] `createColumn` — with orderIndex
- [ ] `updateColumn` — rename
- [ ] `deleteColumn` — cascade delete cards + activity log
- [ ] `reorderColumn`
- [ ] `reindexColumnCards` — gap normalization

### Cards
- [ ] `createCard` — with orderIndex
- [ ] `updateCard` — all fields, cardHistory, notification on assign
- [ ] `moveCard` — orderIndex, activity log, gap check
- [ ] `deleteCard` — cascade
- [ ] `setCardLabels` — delete + reinsert

### Comments
- [ ] `createComment` — with @mention scanning and notification creation
- [ ] `updateComment` — author only
- [ ] `deleteComment` — author or board admin

### Chat
- [ ] `sendChatMessage`

### Notifications
- [ ] `markAsRead`
- [ ] `markAllAsRead`

### Socket.IO Events (all handled in server/index.ts)
- [ ] `JOIN_BOARD` — join room, add presence, send PRESENCE_INIT
- [ ] `LEAVE_BOARD` — leave room, remove presence, broadcast PRESENCE_UPDATE
- [ ] `CARD_CREATED` — broadcast to room
- [ ] `CARD_UPDATED` — broadcast to room
- [ ] `CARD_MOVED` — broadcast to room
- [ ] `CARD_DELETED` — broadcast to room
- [ ] `COLUMN_CREATED` — broadcast to room
- [ ] `COLUMN_UPDATED` — broadcast to room
- [ ] `COLUMN_DELETED` — broadcast to room
- [ ] `TYPING_START` — broadcast to room (exclude sender)
- [ ] `TYPING_STOP` — broadcast to room (exclude sender)
- [ ] `CHAT_MESSAGE_SENT` — broadcast signal (Convex handles persistence)
- [ ] `disconnect` — auto-cleanup presence
