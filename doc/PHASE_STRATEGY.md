# Phase Strategy Document: OnPoint

**Version 1.0 | March 2026**
**References:** IMPLEMENTATION_PLAN.md · FP.md · BP.md · PRD.md · TOOLS_AND_TECHNOLOGIES.md

---

## Table of Contents

1. [Current Project Status](#1-current-project-status)
2. [Pre-Work Checklist (Before Writing a Single Line of Code)](#2-pre-work-checklist-before-writing-a-single-line-of-code)
3. [Phase Overview Map](#3-phase-overview-map)
4. [Phase-by-Phase Breakdown](#4-phase-by-phase-breakdown)
5. [Implementation Order Rationale](#5-implementation-order-rationale)
6. [Recommended Approach & Best Practices](#6-recommended-approach--best-practices)
7. [Risk Register](#7-risk-register)
8. [Definition of Done](#8-definition-of-done)

---

## 1. Current Project Status

### What exists right now

| Item | Status |
|---|---|
| Product Requirements Document (`doc/PRD.md`) | ✅ Complete |
| Tools & Technologies Document (`doc/TOOLS_AND_TECHNOLOGIES.md`) | ✅ Complete |
| Frontend Plan (`doc/FP.md`) | ✅ Complete |
| Backend Plan (`doc/BP.md`) | ✅ Complete |
| Implementation Plan (`doc/IMPLEMENTATION_PLAN.md`) | ✅ Complete |
| Git repository initialized | ✅ Initialized (no code commits yet) |
| Next.js application | ❌ Not created |
| Convex project | ❌ Not created |
| Clerk application | ❌ Not created |
| Socket.IO server | ❌ Not created |
| Any external service accounts | ❌ None created |

### What this means

The project is in the **pure planning state**. Every decision about what to build and how to build it has been made and documented. No code exists yet. No accounts have been created. The next action is account setup (Phase 0), followed immediately by Step 1 of the Implementation Plan.

The planning phase is complete. Do not revise the planning documents during implementation unless you discover a genuine conflict or gap — note it, resolve it, and keep moving.

---

## 2. Pre-Work Checklist (Before Writing a Single Line of Code)

These are the accounts, installations, and configurations that must be in place before you run `npx create-next-app`. Completing them up front means you will never be blocked mid-step waiting for a credential.

### 2.1 Local Development Environment

- [ ] **Node.js 20+** installed — run `node -v` to confirm. If not installed, download from nodejs.org.
- [ ] **npm 10+** installed — run `npm -v` to confirm (comes with Node.js).
- [ ] **Git** installed and configured — run `git config --global user.name "Your Name"` and `git config --global user.email "you@email.com"`.
- [ ] **VS Code** (or preferred editor) installed with the following extensions recommended:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript + JavaScript (built-in)

### 2.2 GitHub

- [ ] **GitHub account** exists at github.com
- [ ] **New repository** created: name it `onpoint`, set to Public (portfolio visibility), initialize with no README (you will push from local)
- [ ] **SSH key or HTTPS token** set up so you can push from the terminal without password prompts

### 2.3 Clerk

- [ ] **Create a Clerk account** at clerk.com (free)
- [ ] **Create a new application**: name it "OnPoint"
- [ ] **Enable sign-in methods**: Email/Password ✓, Google OAuth ✓
- [ ] **Collect these credentials** (from Clerk dashboard → API Keys):
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_`)
  - `CLERK_SECRET_KEY` (starts with `sk_test_`)
- [ ] **Note:** The Webhook Secret (`CLERK_WEBHOOK_SECRET`) is generated later when you register the webhook endpoint — collect it in Step 2.3 of the Implementation Plan.

### 2.4 Convex

- [ ] **Create a Convex account** at convex.dev (free)
- [ ] **Install the Convex CLI globally**: `npm install -g convex`
- [ ] Run `npx convex login` in your terminal to authenticate the CLI
- [ ] **Note:** The actual Convex project is created by running `npx convex dev` inside the Next.js project folder (Step 1.4 of Implementation Plan). The `NEXT_PUBLIC_CONVEX_URL` is generated at that point.
- [ ] In the Convex dashboard, note where to add the Clerk Issuer URL — you will configure this in Step 2.2 of the Implementation Plan (Clerk → Convex JWT integration).

### 2.5 Upstash

- [ ] **Create an Upstash account** at upstash.com (free, no credit card required)
- [ ] **Create a Redis database**:
  - Name: `onpoint-redis`
  - Region: pick the region closest to where your Render server will be (US East is a safe default)
  - Type: Regional (free tier)
- [ ] **Collect these credentials** (from Upstash dashboard → Database Details):
  - `UPSTASH_REDIS_URL` (format: `rediss://...` — note the double `s` for TLS)
  - `UPSTASH_REDIS_TOKEN` (used by the REST API, not needed for ioredis directly)
- [ ] **Note:** ioredis uses the `UPSTASH_REDIS_URL` directly. You do not need the REST token for the Socket.IO server.

### 2.6 Render

- [ ] **Create a Render account** at render.com (free, no credit card required for free tier web services)
- [ ] **Connect your GitHub account** to Render (Settings → Connected Accounts)
- [ ] **Note:** The actual Render service is created in Step 8.8 of the Implementation Plan, once the Socket.IO server code exists. You are just creating the account now.

### 2.7 Vercel

- [ ] **Create a Vercel account** at vercel.com (free)
- [ ] **Connect your GitHub account** to Vercel
- [ ] **Note:** The actual Vercel project is created in Step 18.2 of the Implementation Plan. You are just creating the account now.

### 2.8 Pre-Work Complete Confirmation

Before starting Step 1, you should be able to answer "yes" to all of the following:
- [ ] `node -v` and `npm -v` return version numbers
- [ ] `git --version` returns a version number
- [ ] You have your Clerk publishable key and secret key written down
- [ ] You have your Upstash Redis URL written down
- [ ] You are logged in to Convex CLI (`npx convex login`)
- [ ] You have a blank GitHub repository ready to receive your first push

---

## 3. Phase Overview Map

The 18 implementation steps are grouped into 9 phases. Each phase has a clear goal, a set of implementation plan steps it covers, and a verification checkpoint before moving forward.

```
Phase 0 │ Pre-Work          │ Accounts, credentials, local environment
        │
Phase 1 │ Foundation        │ Steps 1-2  │ App boots, auth works, user synced to Convex
        │
Phase 2 │ Workspace & Data  │ Steps 3-4  │ Full backend, workspaces, invite system, CRUD
        │
Phase 3 │ Core Product UI   │ Steps 5-6  │ Board view, columns, cards, full card modal
        │
Phase 4 │ Drag-and-Drop     │ Step 7     │ Kanban drag works, position persists
        │
Phase 5 │ Real-Time Backend │ Step 8     │ Socket.IO server live, accepts connections
        │
Phase 6 │ Real-Time UI      │ Steps 9-10 │ Two browsers sync live, presence works
        │
Phase 7 │ Collaboration     │ Steps 11-13│ Comments, @mentions, notifications, chat
        │
Phase 8 │ Observability     │ Steps 14-15│ Activity log, permission enforcement
        │
Phase 9 │ Ship              │ Steps 16-18│ Dark mode, mobile, edge cases, deployed
```

---

## 4. Phase-by-Phase Breakdown

---

### Phase 0 — Pre-Work

**Goal:** All accounts created, all credentials collected, local environment ready.

**Implementation Plan Steps:** None (pre-code setup)

**Prerequisites:** A computer with internet access.

**Exit Criteria:** All items in section 2 of this document are checked off. You have all required credentials written in a secure location (a local `.env.local` file that will be created in Step 1).

**Time estimate:** 30–60 minutes.

---

### Phase 1 — Foundation

**Goal:** A Next.js app that runs locally, has all tools installed, Clerk authentication wired in, and a Convex project running. A new user can sign up and their record is created in Convex.

**Implementation Plan Steps:** Step 1 (Project Foundation), Step 2 (Authentication & User Sync)

**Prerequisites before starting:**
- All Phase 0 items complete
- Clerk publishable key + secret key in hand
- Convex CLI logged in
- GitHub repository ready

**What you build:**
- Next.js 14 project with Tailwind, shadcn/ui
- Full Convex schema (all 12 tables) deployed
- Clerk sign-in/sign-up pages
- ConvexClerkProvider + ThemeProvider in root layout
- Clerk auth middleware protecting all app routes
- Clerk webhook syncing `user.created` to Convex `users` table
- Onboarding page (workspace creation flow only — join via invite wired in Phase 2)
- First-login redirect logic

**Exit Criteria — verify before moving to Phase 2:**
- [ ] `npm run dev` starts with no errors
- [ ] Visiting `/sign-up` shows the Clerk sign-up form
- [ ] Completing sign-up redirects to `/onboarding`
- [ ] The Convex dashboard shows a new record in the `users` table after sign-up
- [ ] Visiting a protected route (e.g., `/anything`) while logged out redirects to `/sign-in`
- [ ] The Convex dashboard shows all 12 tables in the schema

---

### Phase 2 — Workspace & Data Layer

**Goal:** The full backend data layer is complete. Users can create workspaces, invite members, and the entire Convex schema (boards, columns, cards, permissions, activity log) is live and tested. The workspace dashboard is functional.

**Implementation Plan Steps:** Step 3 (Workspace Layer), Step 4 (Backend Data Layer)

**Prerequisites before starting:**
- Phase 1 exit criteria all passing
- Users table has at least one record (from sign-up test in Phase 1)

**What you build:**
- All workspace mutations: create, invite, accept invite, update role, remove member, transfer ownership
- Invite system (token-based, 7-day expiry) + invite acceptance page
- Permission system: `assertBoardPermission`, `assertWorkspaceRole`, `requireUser`
- Activity log helper (`writeActivityLog`)
- All board mutations + queries
- All column mutations + queries (including cascade delete and gap reindex)
- All card mutations + queries (including card history and order management)
- App shell with sidebar, workspace dashboard, board grid, workspace settings page

**Exit Criteria — verify before moving to Phase 3:**
- [ ] A signed-in user can create a workspace and land on the dashboard
- [ ] The workspace dashboard shows a "New Board" button and creates a board
- [ ] Running mutations in the Convex dashboard with an unauthorized user throws `FORBIDDEN`
- [ ] Creating a card, moving it, then refreshing — the card is in the new position (Convex persisted)
- [ ] Deleting a column with cards — verify no orphan records remain in `cards`, `cardLabels`, `comments` tables
- [ ] The Convex dashboard shows activity log entries being written on mutations
- [ ] Sending an invite email + clicking the link + accepting → user appears in workspace members list

---

### Phase 3 — Core Product UI

**Goal:** The board is visually usable. Users can see all columns and cards, create and delete them, and edit every card field through the modal. No drag-and-drop yet, no real-time — but everything else is functional.

**Implementation Plan Steps:** Step 5 (Board View Static UI), Step 6 (Card Modal)

**Prerequisites before starting:**
- Phase 2 exit criteria all passing
- At least one workspace + board + 2 columns + 3 cards created in development

**What you build:**
- Board page with horizontal column layout
- Column component with inline rename and delete
- CardItem component (title, labels, assignee avatar, due date badge)
- Add Column and Add Card inline inputs
- Full card modal: Tiptap editor, assignee picker, label picker, due date picker
- Card history tab
- Static comment thread (no real-time yet — live in Phase 7)
- Delete card with confirmation
- Board settings page (rename, visibility, per-member permissions)
- DeleteColumnDialog with card count warning

**Exit Criteria — verify before moving to Phase 4:**
- [ ] The board page shows all columns and cards from Convex
- [ ] Can add a card, click to open the modal, fill in all fields, save — changes persist on refresh
- [ ] Can rename a column by clicking the title
- [ ] Can delete a column with cards — the confirmation shows the card count
- [ ] The card history tab shows a row for each field change made
- [ ] The board settings page lets you change visibility and set per-member permissions
- [ ] Tiptap editor renders formatted text in read mode after saving

---

### Phase 4 — Drag-and-Drop

**Goal:** The Kanban board has full drag-and-drop. Cards move between columns and reorder within columns. Positions persist in Convex. The drag experience is smooth with a ghost card and drop zone highlights.

**Implementation Plan Steps:** Step 7 (Drag-and-Drop)

**Prerequisites before starting:**
- Phase 3 exit criteria all passing
- A board exists with at least 3 columns and 5+ cards spread across them

**What you build:**
- dnd-kit `DndContext` wrapping `BoardView`
- `useSortable` on every `CardItem`
- `SortableContext` per column (vertical) and for columns (horizontal)
- `DragOverlay` ghost card during drag
- `onDragEnd` handler: compute new `orderIndex`, optimistic update, Convex mutation
- `lib/orderIndex.ts` gap strategy utility
- Column drag-to-reorder

**Exit Criteria — verify before moving to Phase 5:**
- [ ] Dragging a card from column A to column B — card appears in column B
- [ ] Refreshing the page — card is still in column B (persisted in Convex)
- [ ] Dragging a card between two other cards — it appears in the correct position
- [ ] Refreshing — position is preserved
- [ ] Clicking a card (without dragging) still opens the modal correctly
- [ ] Dragging columns reorders them, persists on refresh
- [ ] Moving cards rapidly (10 moves) — no duplicate positions, no orphaned cards

---

### Phase 5 — Real-Time Backend

**Goal:** The Socket.IO server is running, deployed, and accepting authenticated WebSocket connections. Board rooms work. All card and column events are broadcast correctly to room members.

**Implementation Plan Steps:** Step 8 (Socket.IO Server)

**Prerequisites before starting:**
- Phase 4 exit criteria all passing
- Upstash Redis URL in hand
- Render account connected to GitHub
- Clerk secret key in hand (for the server-side JWT verification)

**What you build:**
- `server/` Node.js + TypeScript project
- Socket.IO server with CORS configured
- Clerk JWT auth middleware on every connection
- Board room management (JOIN_BOARD, LEAVE_BOARD, disconnect cleanup)
- All card event handlers: CARD_CREATED, CARD_UPDATED, CARD_MOVED, CARD_DELETED
- All column event handlers: COLUMN_CREATED, COLUMN_UPDATED, COLUMN_DELETED
- Typing event handlers: TYPING_START, TYPING_STOP
- Chat broadcast: CHAT_MESSAGE_SENT
- Upstash Redis adapter via `@socket.io/redis-adapter`
- Rate limiter (30 events per 10s per user)
- Deployed to Render

**Exit Criteria — verify before moving to Phase 6:**
- [ ] Running the server locally (`npm run dev` in `server/`): no errors
- [ ] Connecting a Socket.IO client test without a token: connection is refused
- [ ] Connecting with a valid Clerk JWT: connection is accepted
- [ ] Two clients join the same board room — client A emits `CARD_MOVED`, client B receives it
- [ ] The Render deployment is live and accessible at its public URL
- [ ] The Render server logs show "Server running on port X" with no errors

---

### Phase 6 — Real-Time UI

**Goal:** The board is live. Multiple users on the same board see each other's actions instantly. User avatars appear and disappear from the presence bar as people join and leave.

**Implementation Plan Steps:** Step 9 (Real-Time Frontend Integration), Step 10 (Presence)

**Prerequisites before starting:**
- Phase 5 exit criteria all passing
- Render Socket.IO server URL in hand (for `NEXT_PUBLIC_SOCKET_URL` env var)
- Two browser sessions available for testing (one window + one incognito, or two different browsers)

**What you build:**
- `lib/socket.ts` — Socket.IO client singleton
- `SocketProvider` — connects socket on sign-in, disconnects on sign-out
- `useSocket` hook
- `useBoardRoom` hook — joins room, registers all event listeners, manages connection state
- Emit Socket.IO events from all Convex mutation call sites
- Offline connection state banner (yellow, disables drag)
- `usePresence` hook — manages online user map from PRESENCE_INIT + PRESENCE_UPDATE
- `PresenceBar` component — live avatars with tooltips

**Exit Criteria — verify before moving to Phase 7:**
- [ ] Open the same board in two browser sessions
- [ ] Move a card in session A — it moves in session B with no page refresh
- [ ] Create a column in session A — it appears in session B
- [ ] Both sessions show each other's avatars in the presence bar
- [ ] Closing one tab — that user's avatar disappears from the other session's presence bar
- [ ] Disconnect from the internet — yellow offline banner appears, drag is disabled
- [ ] Reconnect — banner disappears, board state is up to date

---

### Phase 7 — Collaboration Features

**Goal:** The full collaboration layer is live. Users can comment on cards, @mention teammates (who receive notifications), and chat on the board in real time.

**Implementation Plan Steps:** Step 11 (Comments & @Mentions), Step 12 (Notifications), Step 13 (Board Chat & Typing Indicators)

**Prerequisites before starting:**
- Phase 6 exit criteria all passing
- At least 2 user accounts for testing @mentions and notifications

**What you build:**
- Tiptap @mention extension in comment input (member dropdown via Tippy.js)
- `extractMentionedUserIds` function in Convex (walks Tiptap JSON tree for mention nodes)
- `createComment` mutation with notification fan-out
- `createNotification` helper called on assignment + @mention
- `updateComment` + `deleteComment` (author-only controls)
- `NotificationBell` with reactive unread count badge
- `NotificationList` dropdown (mark as read, navigate to card)
- `sendChatMessage` mutation + `listByBoard` query
- `ChatPanel` (scrollable history, auto-scroll to newest)
- `ChatMessage` + `ChatInput` components
- `useTypingIndicator` hook (TYPING_START/STOP with 3s auto-timeout)

**Exit Criteria — verify before moving to Phase 8:**
- [ ] User A posts a comment — User B (card open) sees it appear without refresh
- [ ] User A types `@UserB` in a comment — UserB appears in the dropdown
- [ ] Submitting the comment — User B receives a notification badge increment
- [ ] Clicking the notification — navigates to the correct card
- [ ] User A is assigned to a card — User A receives an ASSIGNED notification
- [ ] Board chat: User A sends "hello" — User B sees it in the chat panel immediately
- [ ] User A starts typing in chat — User B sees "UserA is typing..." below the input
- [ ] After 3 seconds of no typing — the indicator disappears

---

### Phase 8 — Observability & Access Control

**Goal:** The activity log shows every board action with filters. Permission enforcement is airtight — view-only users cannot edit anything, and the server enforces this even if the UI is bypassed.

**Implementation Plan Steps:** Step 14 (Activity Log), Step 15 (Permission Enforcement)

**Prerequisites before starting:**
- Phase 7 exit criteria all passing
- Two user accounts with different board permissions to test access control

**What you build:**
- Audit of all mutations to confirm `writeActivityLog` is called everywhere
- Paginated `listByBoard` activity log query (20 entries per page, with actor join)
- `lib/formatActivityEntry.ts` — human-readable string for each action type
- `ActivityLogPanel` — sliding panel with filters (action type + user), infinite scroll, card navigation
- `lib/permissions.ts` — `canEdit(role)`, `canComment(role)` client helpers
- `useBoardPermission` hook
- UI gates: drag handles, Add Card/Column buttons, card field editors hidden for non-edit users
- Server rejection handling: catch `FORBIDDEN` ConvexError, show toast, revert optimistic updates

**Exit Criteria — verify before moving to Phase 9:**
- [ ] Open the activity log — it shows entries for every card move, edit, and comment made in testing
- [ ] Filter by "Card Moved" — only move entries show
- [ ] Filter by a specific user — only their entries show
- [ ] Clicking an activity log entry that references a card — the card modal opens
- [ ] Log in as a view-only user: drag handles are invisible on cards
- [ ] As view-only: "Add Card" and "Add Column" buttons are hidden
- [ ] As view-only: card modal fields are all read-only
- [ ] Manually emit a `CARD_MOVED` socket event as a view-only user (via browser console): Convex mutation rejects it and the card snaps back

---

### Phase 9 — Ship

**Goal:** Dark mode works, the app is usable on mobile, all edge cases from the PRD are handled, and the app is live at a public URL passing the full demo flow.

**Implementation Plan Steps:** Step 16 (Dark Mode & Mobile), Step 17 (Edge Cases & Error Handling), Step 18 (Deployment)

**Prerequisites before starting:**
- Phase 8 exit criteria all passing
- Vercel account connected to GitHub
- Render service URL confirmed
- Upstash Redis URL confirmed
- All environment variables collected and ready

**What you build:**
- Dark mode toggle (next-themes + Tailwind `dark:` variants)
- Mobile column tab navigation (replaces horizontal scroll on small screens)
- Mobile sidebar hamburger (shadcn Sheet)
- Mobile card modal (full-screen bottom sheet)
- Mobile chat (floating action button → bottom Sheet)
- Edge cases: concurrent edit protection, auto-close deleted card modal, offline handling, @mention guard, removed member display, invite expiry error page
- GitHub repository push
- Vercel deployment with all environment variables
- Convex production deployment
- Clerk webhook registered for production
- Socket.IO CORS updated for production URL

**Exit Criteria — Final Demo Checklist:**
- [ ] Dark mode toggle switches theme; the preference persists after refresh
- [ ] On a mobile viewport: board shows column tabs, switching tabs changes the visible column
- [ ] On mobile: sidebar opens as a slide-over
- [ ] On mobile: card modal opens full-screen
- [ ] Open the app at the Vercel URL in two browsers — all real-time features work on the deployed version
- [ ] Complete the full demo scenario: sign up → create workspace → invite teammate → create board → add columns → move card → comment → @mention → check notification → view activity log → confirm view-only user cannot edit
- [ ] The Render Socket.IO server stays warm and responds without cold-start delays

---

## 5. Implementation Order Rationale

This section explains why the phases are ordered the way they are. Understanding the reasoning helps you make good judgment calls when you encounter the unexpected.

### Why Foundation before everything else (Phase 1)

You cannot test any feature without auth. Convex queries require an authenticated user. The entire permission system is built on the assumption that a valid user record exists in Convex. If auth is broken, nothing else can be verified. Build the auth foundation first and verify it completely before adding any feature on top of it.

### Why data layer before UI (Phase 2 before Phase 3)

The board view renders data from Convex. If the mutations and queries are not built, the UI components have nothing to call. Building the data layer first means every UI component you write is immediately testable — you can populate data in the Convex dashboard and see it render. This also forces you to think through the permission logic (which belongs to the data layer) before the UI is involved.

### Why static UI before drag-and-drop (Phase 3 before Phase 4)

Drag-and-drop is a complex interaction that depends on the card list being rendered correctly. If the static rendering of columns and cards is wrong, drag-and-drop will inherit those bugs and be much harder to debug. Get the static board right first, then add the interaction layer on top of a stable base.

### Why Socket.IO server before the frontend integration (Phase 5 before Phase 6)

You cannot write a WebSocket client without a server to connect to. Building the Socket.IO server first and verifying it accepts connections and broadcasts events correctly means the frontend integration is just about wiring — there are no server-side unknowns left to discover.

### Why the Socket.IO server is a separate phase from the frontend (Phase 5 and Phase 6 are separate)

The Socket.IO server is a completely different process with its own dependencies, auth middleware, and deployment. Mixing its development with the frontend integration step creates two parallel debugging surfaces at once. Build the server, deploy it, and confirm it works independently. Then connect the frontend to a known-good server.

### Why collaboration features after basic real-time (Phase 7 after Phase 6)

Comments, @mentions, and notifications depend on the real-time infrastructure being in place. A comment that appears in real time requires Socket.IO to be working. A notification that arrives instantly requires Convex reactive queries to be connected. Phase 6 establishes these two channels; Phase 7 uses them.

### Why observability and permissions after collaboration (Phase 8 after Phase 7)

The activity log is only meaningful once there are many actions to log. Permissions are most important to test once the full feature set exists — testing that a view-only user cannot post a comment, move a card, or add a label requires all of those features to exist first.

### Why dark mode and mobile last (Phase 9)

Dark mode and responsive layout are visual enhancements layered on top of working functionality. Doing them last avoids the trap of spending time polishing a component that will later change significantly. Once the feature set is stable, dark mode and mobile adaptation are applied as a final pass.

### Why edge cases are in the final phase

Edge cases require the happy path to exist first. You cannot test what happens when a card is deleted while someone has it open until the card modal exists, the delete mutation exists, and the Socket.IO broadcast exists. All three features must be complete before the edge case can be handled.

---

## 6. Recommended Approach & Best Practices

### 6.1 Develop in the order of the Implementation Plan

The Implementation Plan is not a suggestion — it is the sequence. Resist the temptation to jump ahead to the exciting parts (drag-and-drop, real-time). A half-built foundation causes compounding problems that take longer to fix than they would have taken to build correctly.

### 6.2 Test every exit criterion before advancing

The exit criteria at the end of each phase are not optional. They exist because each phase's output is an assumption the next phase relies on. If Phase 1's exit criteria are not met and you start Phase 2, you are building on an uncertain foundation. When something breaks in Phase 3, you will not know if the bug is in Phase 3 or Phase 1.

### 6.3 Use the Convex dashboard as your primary debugging tool

The Convex dashboard at dashboard.convex.dev provides:
- A function runner to call any mutation or query with test data
- A data browser to inspect every record in every table
- A log viewer showing every function call, its arguments, and its output

Use this constantly. Before writing any UI component that reads data, verify the underlying Convex query returns the correct data by calling it in the dashboard first.

### 6.4 Keep `.env.local` as a single source of truth for all credentials

Maintain `.env.local` as the definitive list of all credentials. Every time you add a new environment variable, add it to `.env.local` immediately. Do not rely on memory. At any point you should be able to delete your `.env.local`, re-read this document, and reconstruct it from section 2.

### 6.5 One concern at a time — resist the urge to multitask

Each substep in the Implementation Plan does one specific thing. Do not combine multiple substeps into one commit or one block of work. The commit messages exist to create a clear, reviewable trail. If you find yourself writing a commit that does three different things, you have skipped a step boundary.

### 6.6 Keep the Socket.IO server simple

The Socket.IO server's only job is to broadcast events to board rooms. It does not write to the database. It does not contain business logic. If you find yourself adding data persistence or complex logic to the Socket.IO server, stop — that logic belongs in a Convex mutation. The Socket.IO server should remain thin.

### 6.7 Always emit Socket.IO AND call the Convex mutation (never just one)

Every state-changing user action must do two things:
1. Call the Convex mutation (persists data, enforces permissions, writes activity log)
2. Emit the Socket.IO event (notifies other users immediately)

Skipping the Socket.IO emit means other users only get the update when Convex's reactive query propagates it (which takes slightly longer and does not handle all event types like presence). Skipping the Convex mutation means the change is not persisted and is lost on disconnect.

### 6.8 Never store sensitive data in Socket.IO server memory

The Socket.IO server stores two things in memory: board room memberships and presence state. Both are ephemeral — they are reconstructed when users reconnect. Never store JWTs, card data, or user credentials in the server's memory. The server verifies JWTs once at connection time and trusts the decoded identity for the lifetime of that connection.

### 6.9 Verify the Clerk → Convex JWT integration before building anything else

The single most common failure point in this stack is the Clerk JWT not being correctly passed to Convex. If `ctx.auth.getUserIdentity()` inside a Convex mutation returns `null`, no permission check will work and no user can do anything. Verify this works in Phase 1 before moving on. Signs it is working: calling `requireUser()` in any mutation returns a user object.

### 6.10 Use two browser sessions throughout development

From Phase 6 onward, always have two browser sessions open when testing. The single most important demo feature — two users seeing the same change in real time — can only be tested with two sessions. One window + one incognito window in Chrome works perfectly.

### 6.11 Commit at every substep, not in batches

Each substep ends with a commit message. Make that commit immediately when the substep is done and the app still runs correctly. Do not batch 5 substeps and commit them together. Small commits mean that when something breaks, you can identify exactly which change introduced the bug.

### 6.12 If a step takes more than twice as long as expected, ask why

Long steps usually mean one of three things: (a) a prerequisite from an earlier phase is actually broken, (b) the step is doing more than it should (split it), or (c) the tool you are integrating behaves differently than documented. In all three cases, stop and diagnose before continuing.

---

## 7. Risk Register

These are the most likely sources of delay or failure during implementation, and how to handle each one.

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Clerk → Convex JWT integration fails | Medium | High | Verify in Phase 1 before building anything else. Official `ConvexProviderWithClerk` docs have an exact setup guide. |
| Socket.IO CORS errors block connection | Medium | High | Set `ALLOWED_ORIGIN` to the exact frontend URL. `http://localhost:3000` in dev, Vercel URL in prod. Wildcard origins (`*`) do not work with `credentials: true`. |
| Render cold-start delays break demo | High | Medium | Warm the server by opening the board 1 minute before any demo. Record a backup video as insurance. |
| Upstash Redis TLS connection failure | Low | Medium | Use `rediss://` (double s) in the URL. Verify the `ioredis` client options include `tls: { rejectUnauthorized: false }` for Upstash. |
| dnd-kit onDragEnd fires on card click | Medium | Low | The `activationConstraint: { distance: 8 }` on `PointerSensor` prevents this. Do not remove this constraint. |
| Convex reactive query not updating after mutation | Low | High | Ensure the query and mutation touch the same table. Convex triggers reruns based on which tables were read, not which were written. If a query reads `cards` and the mutation writes `cards`, the query will rerun. |
| Gap strategy order index collisions under rapid moves | Low | Medium | The `reindexColumnCards` call at the end of `moveCard` (when gap < 10) handles this. Verify it is implemented in Phase 4. |
| Tiptap @mention dropdown not showing | Medium | Low | Tippy.js requires a DOM node as the reference element. Follow the exact Tiptap Mention extension example in the official docs. |
| Clerk webhook not firing for new users | Medium | High | For local dev, use the Clerk CLI to forward webhooks: `npx clerk webhooks listen`. For production, verify the endpoint URL in the Clerk dashboard matches the deployed Vercel URL exactly. |

---

## 8. Definition of Done

The project is completely done when every item below is true:

### Code
- [ ] All 18 implementation plan steps are marked complete
- [ ] No `TODO` comments remain in the codebase (or all are documented as known post-v1 items)
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit` returns nothing)
- [ ] No browser console errors on any page in the deployed app

### Features (PRD Verification)
- [ ] Authentication (email/password + Google OAuth) works on the deployed app
- [ ] Workspace creation, invite, and member management work end-to-end
- [ ] Board, column, and card CRUD all work and persist
- [ ] Drag-and-drop persists card positions after refresh
- [ ] Two users see card moves in real time (< 200ms apparent delay)
- [ ] Comments appear in real time for all users with the card open
- [ ] @mentions trigger notifications for the mentioned user
- [ ] Card assignments trigger notifications for the assigned user
- [ ] Activity log shows every action with actor name and timestamp
- [ ] View-only users cannot move cards, edit cards, or add columns (server-enforced)
- [ ] Presence bar shows/hides avatars in real time as users join/leave
- [ ] Board chat sends and receives messages in real time
- [ ] Typing indicator appears and disappears correctly
- [ ] Dark mode toggle works and persists

### Deployment
- [ ] App is live at a public Vercel URL
- [ ] Socket.IO server is live on Render
- [ ] Convex production deployment is active
- [ ] All environment variables are set in Vercel and Render
- [ ] Clerk webhook is registered and firing for the production URL

### Demo Readiness
- [ ] The full demo scenario (from PRD section 7.4) can be executed end-to-end in under 10 minutes
- [ ] The demo has been rehearsed at least twice
- [ ] The Render server is warm (board page opened once before the demo)
- [ ] A backup screen recording of the demo exists in case of live failure
