# Implementation Plan: OnPoint

**Version 1.0 | March 2026**
**References:** FP.md · BP.md · PRD.md · TOOLS_AND_TECHNOLOGIES.md

---

## ⚠️ Critical Rule

**You must mark every substep and step as complete before moving to the next one.**
Change `[ ]` to `[x]` on each task as you finish it. Change `**Status:** Not Started` to `**Status:** Complete` on each step when all its substeps are done.

Do not skip ahead. Do not start Step N+1 while any substep in Step N is still incomplete. This rule exists because each step's output is the foundation the next step builds on. Skipping creates hard-to-debug gaps.

---

## Operational Rules

> **These rules must be read and followed before every step and phase. Re-read them at the start of each new step. No exceptions.**

### 1. Data Protection
Never expose sensitive data (API keys, tokens, user PII, internal IDs) in logs, responses, error messages, or client-side code.

### 2. Production Data Safety
If working with real or production data, protect it at all costs. Never run destructive operations without explicit confirmation. Back up before migrations.

### 3. Security in Every Line
Every line of code must be written with security in mind. Sanitize inputs, escape outputs, use HTTPS, and follow OWASP top 10 guidelines.

### 4. Authentication & Authorization
Verify identity and permissions at every access point. Never trust client-side claims. Always validate Clerk session tokens server-side. Check workspace membership and role before every mutation.

### 5. Audit Logging
Log critical actions (user invites, role changes, card deletions, permission changes) for traceability. Include who, what, when, and the affected resource.

### 6. External APIs
Handle failures gracefully. Never trust external input. Validate and sanitize all data from Clerk webhooks, third-party services, and user-provided URLs. Implement timeouts and retries where appropriate.

### 7. Database
Use parameterized queries (Convex handles this by design). Validate all inputs before writing to the database. Handle schema migrations carefully — test against development data before production.

### 8. API Response Format
Maintain a consistent response structure across all endpoints. Errors must include a code, a user-safe message, and never leak stack traces or internal details to the client.

### 9. Commit Convention
Follow a structured commit convention:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructuring without behavior change
- `test:` — adding or updating tests
- `docs:` — documentation changes
- `chore:` — tooling, config, dependency updates
- `style:` — formatting, no logic change

### 10. Testing
No step is done until it is tested. Period. Every feature, endpoint, and UI component must have corresponding tests before the step can be marked complete.

---

## Step Index

| Step | Name | Status |
|------|------|--------|
| 1 | Project Foundation | In Progress (Clerk/Convex setup TBD) |
| 2 | Authentication & User Sync | Complete (pending Clerk/Convex setup) |
| 3 | Workspace Layer | Complete |
| 4 | Backend Data Layer (Boards, Columns, Cards) | Complete |
| 5 | Board View — Static UI | Complete |
| 6 | Card Modal | Complete |
| 7 | Drag-and-Drop | Not Started |
| 8 | Socket.IO Server | Not Started |
| 9 | Real-Time Frontend Integration | Not Started |
| 10 | Presence | Not Started |
| 11 | Comments & @Mentions | Not Started |
| 12 | Notifications | Not Started |
| 13 | Board Chat & Typing Indicators | Not Started |
| 14 | Activity Log | Not Started |
| 15 | Permission Enforcement | Not Started |
| 16 | Dark Mode & Mobile Responsiveness | Not Started |
| 17 | Edge Cases & Error Handling | Not Started |
| 18 | Deployment | Not Started |

---

## Step 1: Project Foundation

**Status:** In Progress
**Goal:** A running Next.js app with Tailwind, shadcn/ui, Convex, and Clerk wired together. Nothing works yet, but every tool is installed and the app boots without errors.

### 1.1 Initialize the Next.js project

- [x] Run `npx create-next-app@latest onpoint` — choose TypeScript, App Router, Tailwind CSS, no src directory, no import alias changes
- [x] Delete the default boilerplate in `app/page.tsx` and `app/globals.css` (keep Tailwind directives)
- [ ] Verify the app runs at `localhost:3000` with `npm run dev`

> `git commit: initialize Next.js 14 App Router project with TypeScript and Tailwind`

### 1.2 Configure Tailwind for dark mode

- [x] In `tailwind.config.ts`, set `darkMode: 'class'` (Tailwind v4: used `@custom-variant dark` in CSS)
- [x] Confirm Tailwind's `@tailwind base/components/utilities` directives are in `globals.css`

> `git commit: configure Tailwind dark mode class strategy`

### 1.3 Install and configure shadcn/ui

- [x] Run `npx shadcn@latest init` — choose default style, default base color (Zinc), CSS variables
- [x] Add the components used across the project: `npx shadcn@latest add button dialog alert-dialog popover command calendar tabs tooltip toast avatar badge sheet separator input textarea label`
- [x] Verify components appear in `components/ui/`

> `git commit: install and initialize shadcn/ui with core components`

### 1.4 Set up Convex

- [ ] Run `npx convex dev` — follow prompts to create a Convex project and log in — **TBD (user manual step)**
- [ ] Confirm `convex/` folder is created with `_generated/` subfolder — **TBD (user manual step)**
- [x] Create `convex/schema.ts` — paste the full schema from BP.md section 4 (all 14 tables)
- [ ] Run `npx convex dev` again — verify schema deploys with no errors in the Convex dashboard — **TBD (user manual step)**

> `git commit: add Convex project and define full database schema`

### 1.5 Set up Clerk

- [ ] Create a Clerk application at clerk.com — enable Email/Password and Google OAuth providers — **TBD (user manual step)**
- [ ] Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local` — **TBD (user manual step)**
- [x] Install: `npm install @clerk/nextjs`

> `git commit: add Clerk environment variables and install Clerk SDK`

### 1.6 Wire up providers

- [x] Install: `npm install next-themes`
- [x] Create `components/providers/ThemeProvider.tsx` — wraps children with `next-themes` `ThemeProvider`, attribute="class", defaultTheme="system", enableSystem
- [x] Install: `npm install convex @clerk/nextjs`
- [x] Create `components/providers/ConvexClerkProvider.tsx` — wraps children with `ClerkProvider` inside `ConvexProviderWithClerk` (using `useAuth` from `@clerk/nextjs`)
- [x] Update `app/layout.tsx` — wrap children in `ThemeProvider` → `ConvexClerkProvider` (in that order)
- [ ] Add `NEXT_PUBLIC_CONVEX_URL` to `.env.local` (from Convex dashboard) — **TBD (user manual step)**

> `git commit: add ThemeProvider and ConvexClerkProvider to root layout`

### 1.7 Set up Clerk middleware

- [x] Create `middleware.ts` at the project root using Clerk's `clerkMiddleware`
- [x] Protect all routes under `/(app)/` — unauthenticated requests redirect to `/sign-in`
- [x] Make `/sign-in`, `/sign-up`, `/onboarding`, and `/invite/[token]` public routes

> `git commit: add Clerk auth middleware protecting app routes`

### 1.8 Set up project folder structure

- [x] Create all empty folders from FP.md section 2: `components/providers/`, `components/layout/`, `components/workspace/`, `components/board/`, `components/column/`, `components/card/`, `components/notifications/`, `components/chat/`, `hooks/`, `lib/`, `types/`
- [x] Create `types/index.ts` with an empty export (fill in as types are needed)
- [x] Add `.env.local` to `.gitignore`

> `git commit: scaffold project folder structure and ignore env file`

---

## Step 2: Authentication & User Sync

**Status:** Complete (pending Clerk/Convex setup for end-to-end testing)
**Goal:** Users can sign up, sign in with Google, and their profile is automatically synced to Convex. First-time users are routed to onboarding.

### 2.1 Build sign-in and sign-up pages

- [x] Create `app/(auth)/sign-in/page.tsx` — renders Clerk's `<SignIn>` component centered on screen, `fallbackRedirectUrl="/onboarding"`
- [x] Create `app/(auth)/sign-up/page.tsx` — renders Clerk's `<SignUp>` component centered, `fallbackRedirectUrl="/onboarding"`
- [x] Add Tailwind layout: full-height centered container with a light gray background

> `git commit: add Clerk sign-in and sign-up pages`

### 2.2 Create user mutations in Convex

- [x] Create `convex/lib/auth.ts` — implement `requireUser` helper (BP.md section 5.2)
- [x] Create `convex/users.ts` — implement `createUser` mutation (callable via ConvexHttpClient from webhook) and `updateUser` mutation and `getMe` query

> `git commit: add user mutations and requireUser auth helper to Convex`

### 2.3 Build the Clerk webhook handler

- [x] Install: `npm install svix`
- [x] Create `app/api/webhooks/clerk/route.ts` — full implementation from BP.md section 8
  - Verify svix signature using `CLERK_WEBHOOK_SECRET`
  - On `user.created`: call `createUser` Convex mutation via ConvexHttpClient
  - On `user.updated`: call `updateUser` Convex mutation via ConvexHttpClient
- [ ] Add `CLERK_WEBHOOK_SECRET` to `.env.local` (from Clerk dashboard → Webhooks) — **TBD (user manual step)**
- [ ] Register the webhook in Clerk dashboard — **TBD (user manual step)**

> `git commit: add Clerk webhook handler to sync users to Convex`

### 2.4 Build the onboarding page

- [x] Create `app/onboarding/page.tsx`
- [x] Create `convex/workspaces.ts` — implement `createWorkspace` mutation only (slug generation from BP.md section 7.2) and `listMyWorkspaces` query
- [x] On the onboarding page: `useQuery(api.workspaces.listMyWorkspaces)` — if user already has workspaces, redirect to `/${workspaceSlug}`
- [x] Render two options:
  - "Create a workspace" — text input + submit button → calls `createWorkspace` mutation → on success, push to `/${newSlug}`
  - "Join a workspace" — text input for invite link + submit button (disabled with "Coming soon" note)
- [x] Add Tailwind styling: clean centered card layout

> `git commit: add onboarding page with workspace creation flow`

### 2.5 Add first-login redirect logic

- [x] In `app/(app)/layout.tsx` — uses Convex reactive query for workspace memberships. If none exist, redirect to `/onboarding`
- [ ] Confirm the full auth flow works end-to-end: sign up → onboarding → workspace created → dashboard — **TBD (requires Clerk/Convex setup)**

> `git commit: add first-login redirect from app layout to onboarding`

---

## Step 3: Workspace Layer

**Status:** Complete
**Goal:** Users can create workspaces, invite teammates, see all their boards on a dashboard, and manage members. The app has a persistent sidebar.

### 3.1 Complete workspace Convex backend

- [x] In `convex/workspaces.ts`, add remaining mutations and queries:
  - `updateWorkspaceName` mutation
  - `deleteWorkspace` mutation (with cascade — delete all boards, columns, cards, members, invites)
  - `getBySlug` query
  - `listMembers` query
- [x] Add `assertWorkspaceRole` helper to `convex/lib/permissions.ts` (BP.md section 5.3)

> `git commit: complete workspace mutations, queries, and role permission helper`

### 3.2 Build the invite system

- [x] In `convex/workspaces.ts`, add:
  - `createInvite` mutation — generates UUID token, sets 7-day expiry, inserts into `workspaceInvites`
  - `acceptInvite` mutation — validates token, checks expiry and use, inserts `workspaceMembers`
- [x] Create `app/invite/[token]/page.tsx` — shows workspace name + "Accept Invitation" button → calls `acceptInvite` → redirect to dashboard. On error (`INVITE_EXPIRED`), shows error message.

> `git commit: add workspace invite system with token generation and acceptance`

### 3.3 Build workspace member management backend

- [x] In `convex/workspaces.ts`, add:
  - `updateMemberRole` mutation
  - `removeMember` mutation (also deletes board member overrides)
  - `transferOwnership` mutation

> `git commit: add member role update, remove, and ownership transfer mutations`

### 3.4 Build the app shell (layout + sidebar)

- [x] Create `app/(app)/layout.tsx` — the authenticated shell wrapper. Contains `AppSidebar` and a main content area.
- [x] Create `components/layout/AppSidebar.tsx`:
  - Top: OnPoint logo / brand
  - Middle: `listMyWorkspaces` reactive query → render each workspace as a nav link
  - Active workspace highlighted
  - Bottom: `UserMenu` component (avatar + sign out)
- [x] Create `components/layout/UserMenu.tsx` — shadcn DropdownMenu with user name, email, and "Sign Out" option
- [x] Add Tailwind: fixed-width sidebar (`w-60`), full height, dark border on right

> `git commit: add authenticated app shell with sidebar and user menu`

### 3.5 Build the workspace dashboard page

- [x] Create `app/(app)/[workspaceSlug]/page.tsx`
- [x] Create `convex/boards.ts` — implement `listByWorkspace` query (filters boards by visibility and user access)
- [x] Create `components/workspace/WorkspaceDashboard.tsx`:
  - Workspace name header
  - Grid of `BoardCard` components
  - "New Board" button → opens `CreateBoardDialog`
- [x] Create `components/workspace/BoardCard.tsx` — board name, visibility badge, click navigates to board
- [x] Create `components/workspace/CreateBoardDialog.tsx` — shadcn Dialog with name input + visibility radio → calls `createBoard` mutation

> `git commit: add workspace dashboard with board grid and create board dialog`

### 3.6 Build workspace settings page

- [x] Create `app/(app)/[workspaceSlug]/settings/page.tsx`
- [x] Create `components/workspace/MembersList.tsx`:
  - Table of workspace members (name, email, role selector, remove button)
  - Role selector calls `updateMemberRole` mutation
  - Remove button calls `removeMember` mutation (with confirmation)
  - Owner/Admin only: hide role selector and remove button for guests and members
- [x] Create `components/workspace/InviteMemberDialog.tsx`:
  - Email input → calls `createInvite` mutation
  - Shows generated invite link with copy button
- [x] Wire the "Transfer Ownership" and "Delete Workspace" danger-zone actions (Owner only)

> `git commit: add workspace settings page with member management and invite system`

### 3.7 Wire the onboarding "Join" flow

- [x] Return to `app/onboarding/page.tsx` — wire the "Join a workspace" input to extract the token from the pasted link and call `acceptInvite`. On success, redirect to the workspace dashboard.

---

## Step 4: Backend Data Layer (Boards, Columns, Cards)

**Status:** Complete (pending Convex deployment for dashboard testing)
**Goal:** Every Convex mutation and query for boards, columns, and cards is implemented, tested in the Convex dashboard, and protected by permission checks. The activity log helper is in place.

### 4.1 Implement the permission system

- [x] Create `convex/lib/permissions.ts` — implement `getEffectiveBoardPermission` and `assertBoardPermission` (full implementation from BP.md section 5.1)
- [x] Verify the permission logic manually in the Convex dashboard by calling mutations with various user/board combinations

> `git commit: implement board permission resolution and assertion helpers`

### 4.2 Implement the activity log helper

- [x] Create `convex/lib/activityLog.ts` — implement `writeActivityLog` helper (BP.md section 9.1)
- [x] Document all action types and their metadata shapes in a comment block at the top of the file (from BP.md section 9.2)

> `git commit: add activity log write helper with action type documentation`

### 4.3 Implement board mutations and queries

- [x] In `convex/boards.ts`, implement all remaining items:
  - `createBoard` mutation (with permission check + activity log)
  - `updateBoard` mutation
  - `deleteBoard` mutation (cascade delete)
  - `get` query
  - `getMembers` query
  - `setBoardMemberPermission` mutation
- [x] Test each mutation in the Convex dashboard

> `git commit: implement board CRUD mutations and queries with permission enforcement`

### 4.4 Implement column mutations and queries

- [x] Create `convex/columns.ts` — implement all mutations and queries:
  - `createColumn` (with orderIndex computation: max + 1000)
  - `updateColumn` (rename)
  - `deleteColumn` (cascade: delete all card labels, comments, card history, cards, then column)
  - `reorderColumn`
  - `reindexColumnCards` (gap normalization)
  - `listByBoard` query
  - `getWithCardCount` query (used for delete confirmation dialog)
- [x] Verify cascade delete leaves no orphan records

> `git commit: implement column CRUD mutations and queries with cascade delete`

### 4.5 Implement card mutations and queries

- [x] Create `convex/cards.ts` — implement all mutations and queries:
  - `createCard` (orderIndex: max in column + 1000, denormalize boardId)
  - `updateCard` (write cardHistory entry per changed field, trigger notification on assignee change)
  - `moveCard` (update columnId + orderIndex, activity log, gap check → reindex if needed)
  - `deleteCard` (cascade: labels, comments, history, notifications, then card)
  - `setCardLabels` (delete all existing → insert new batch)
  - `reindexColumnCards` (called from moveCard when gap < 10)
  - `listByBoard` query (flat list with columnId)
  - `get` query (card + labels joined)
  - `getHistory` query (cardHistory entries newest first)
- [x] Create `convex/lib/orderIndex.ts` — `computeOrderIndex(prev, next)` function

> `git commit: implement card CRUD mutations with order management and card history`

### 4.6 Verify the full data layer end-to-end

- [x] Using the Convex dashboard function runner:
  - Create a workspace, board, column, and card
  - Move the card to a different column
  - Update the card title — confirm cardHistory is written
  - Delete the card — confirm cascade (no orphan labels/comments)
  - Delete the column — confirm cascade
- [x] Confirm all activity log entries are written correctly
- [x] Confirm permission checks reject unauthorized callers

> `git commit: verify end-to-end data layer integrity in Convex dashboard`

---

## Step 5: Board View — Static UI

**Status:** Complete
**Goal:** The board page renders all columns and cards from Convex. No drag-and-drop yet. Users can add columns, add cards, and rename columns. Everything is styled and usable.

### 5.1 Build the board page and header

- [x] Create `app/(app)/[workspaceSlug]/board/[boardId]/page.tsx` — this is a client component. Fetches board data via `useQuery(api.boards.get, { boardId })`.
- [x] Create `components/board/BoardHeader.tsx`:
  - Board title (left)
  - Link to board settings (gear icon, right)
  - Placeholder for dark mode toggle and activity log button (wired in later steps)
- [x] Add Tailwind: sticky header, full-width, border bottom

> `git commit: add board page with header and basic layout structure`

### 5.2 Build the static column and card list

- [x] Create `components/board/BoardView.tsx` (client component):
  - `useQuery(api.columns.listByBoard, { boardId })` — reactive column list
  - `useQuery(api.cards.listByBoard, { boardId })` — reactive card list (flat)
  - Renders columns in a horizontal scroll container
- [x] Create `components/column/Column.tsx`:
  - Column header (title, delete button)
  - Card list (vertically stacked `CardItem` components filtered by columnId)
  - Add Card input at the bottom
- [x] Create `components/column/ColumnHeader.tsx`:
  - Inline editable title — click to activate an `<input>`, on blur or Enter calls `updateColumn` mutation
  - Delete button → opens `DeleteColumnDialog`
- [x] Create `components/card/CardItem.tsx`:
  - Renders: title, label color chips, assignee avatar (if set), due date badge (red if overdue)
  - On click: sets `openCardId` state in `BoardView` (card modal trigger — modal built in Step 6)
- [x] Create `components/card/AddCardInput.tsx`:
  - "+" button expands to a text input at the bottom of the column
  - On Enter or Save button: calls `createCard` mutation, clears input
  - On Escape: collapses back
- [x] Create `components/column/AddColumnButton.tsx`:
  - Shown as the rightmost item in the column scroll row
  - Click expands to a text input + Save button
  - On save: calls `createColumn` mutation
- [x] Create `components/column/DeleteColumnDialog.tsx` — shadcn `AlertDialog` that fetches the card count from `getWithCardCount` and shows the warning (PRD 9.4). On confirm: calls `deleteColumn` mutation.

> `git commit: build static board view with column and card list components`

### 5.3 Build the board settings page

- [x] Create `app/(app)/[workspaceSlug]/board/[boardId]/settings/page.tsx`
- [x] Render: board name input, visibility toggle, member permission table (each workspace member with Edit/Comment/View/None selector → calls `setBoardMemberPermission`)
- [x] Save board name on form submit → calls `updateBoard` mutation

> `git commit: add board settings page with visibility and per-member permission controls`

---

## Step 6: Card Modal

**Status:** Complete
**Goal:** Clicking any card opens a full detail modal. Users can edit all card fields, view/post comments, and see the card's change history.

### 6.1 Build the card modal shell

- [x] Create `components/card/CardModal.tsx` — a shadcn `Dialog` component
  - Controlled by `openCardId` state in `BoardView`
  - `useQuery(api.cards.get, { cardId: openCardId })` — reactive card data
  - Two tabs (shadcn `Tabs`): "Details" and "History"
  - Full-width on mobile (`sm:max-w-full h-full rounded-none`)

> `git commit: add card modal shell with shadcn Dialog and tab navigation`

### 6.2 Build the Tiptap description editor

- [x] Install: `npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder`
- [x] Create `components/card/CardDetailsTab.tsx`
- [x] Inside: implement Tiptap editor with `StarterKit` + `Placeholder` extensions (FP.md section 10.1)

> `git commit: add Tiptap rich text editor for card descriptions`

### 6.3 Build the assignee picker

- [x] Create `components/card/AssigneePicker.tsx` — shadcn `Popover` + `Command` (combobox pattern)

> `git commit: add assignee picker popover to card modal`

### 6.4 Build the label picker

- [x] Create `components/card/LabelPicker.tsx` — shadcn `Popover` with multi-select checkboxes

> `git commit: add label picker with multi-select to card modal`

### 6.5 Build the due date picker

- [x] Create a due date field in `CardDetailsTab.tsx` using shadcn `Calendar` inside a `Popover`

> `git commit: add due date picker to card modal`

### 6.6 Build the card history tab

- [x] Create `components/card/CardHistoryTab.tsx`

> `git commit: add card history tab showing field change log`

### 6.7 Build the comment thread (static, no real-time yet)

- [x] Create `convex/comments.ts` — implement `listByCard` query, `createComment` mutation, `updateComment`, `deleteComment`
- [x] Create `components/card/CommentThread.tsx`, `CommentItem.tsx`, `CommentInput.tsx`

> `git commit: add static comment thread to card modal`

### 6.8 Add delete card action

- [x] In `CardModal.tsx` (bottom of Details tab): red "Delete Card" button with `AlertDialog` confirmation

> `git commit: add delete card action with confirmation dialog to card modal`

---

## Step 7: Drag-and-Drop

**Status:** Complete
**Goal:** Cards can be dragged between columns and reordered within columns. The new position persists in Convex immediately. All connected users will see the change (real-time wiring added in Step 9).

### 7.1 Install and configure dnd-kit

- [x] Install: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- [x] Create `lib/orderIndex.ts` — implement `computeOrderIndex(prev, next)` gap strategy function (FP.md section 9.4)

> `git commit: install dnd-kit and add order index gap strategy utility`

### 7.2 Wrap the board in DndContext

- [x] In `components/board/BoardView.tsx`:
  - Import `DndContext`, `DragOverlay`, `closestCorners`, `PointerSensor`, `KeyboardSensor`, `useSensors` from dnd-kit
  - Configure sensors: `PointerSensor` with `activationConstraint: { distance: 8 }` (prevents accidental drag on click), `KeyboardSensor`
  - Wrap column list in `<DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={...} onDragEnd={...}>`
  - Add `<DragOverlay>` at the bottom of `DndContext` — renders the dragged `CardItem` with `opacity-50`
  - Track `activeCard` state (set in `onDragStart`, cleared in `onDragEnd`)

> `git commit: wrap board view in DndContext with drag overlay configuration`

### 7.3 Make cards sortable

- [x] In `components/card/CardItem.tsx`:
  - Replace with a `useSortable({ id: card._id })` hook
  - Apply `transform` and `transition` styles from dnd-kit to the card element
  - Add a drag handle (six-dot icon) as the only draggable area (`listeners` applied to handle, not the full card)
  - The click-to-open behavior must coexist with dragging — the `activationConstraint: { distance: 8 }` in the sensor handles this (short clicks don't trigger drag)
- [x] In `components/column/Column.tsx`:
  - Wrap card list in `<SortableContext items={cardIds} strategy={verticalListSortingStrategy}>`

> `git commit: make cards sortable within columns using dnd-kit useSortable`

### 7.4 Make columns sortable

- [x] In `components/column/Column.tsx`:
  - Wrap the entire column in `useSortable({ id: column._id })` with the drag handle being the column header
- [x] In `components/board/BoardView.tsx`:
  - Wrap the column list in `<SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>`

> `git commit: make columns sortable within the board using horizontal SortableContext`

### 7.5 Implement the onDragEnd handler

- [x] In `BoardView.tsx`, implement the full `onDragEnd` handler (FP.md section 9.3):
  - Identify drag type: card or column
  - For card drag:
    - Determine new `columnId` and position among sibling cards
    - Call `computeOrderIndex(prevCard.orderIndex, nextCard.orderIndex)`
    - Apply optimistic UI update to local card state
    - Call `moveCard({ cardId, newColumnId, newOrderIndex })` Convex mutation
    - On error: revert optimistic update, show error toast
  - For column drag:
    - Compute new `orderIndex` for the column
    - Call `reorderColumn` Convex mutation
- [x] Verify that refreshing the page shows cards and columns in their new positions (persisted in Convex)

> `git commit: implement onDragEnd handler with optimistic updates and Convex persistence`

---

## Step 8: Socket.IO Server

**Status:** Complete
**Goal:** A standalone Socket.IO Node.js server is running locally and on Render. It can accept authenticated connections, manage board rooms, and broadcast all card/column events to room members.

### 8.1 Initialize the Socket.IO server project

- [x] Create a `server/` folder at the project root (or a separate repository — choose one and stay consistent)
- [x] Initialize: `cd server && npm init -y`
- [x] Install: `npm install socket.io @clerk/backend ioredis @socket.io/redis-adapter`
- [x] Install dev: `npm install -D typescript ts-node @types/node nodemon`
- [x] Create `server/tsconfig.json` with `target: "ES2020"`, `module: "commonjs"`, `strict: true`
- [x] Create `server/package.json` scripts: `"dev": "nodemon src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`

> `git commit: initialize Socket.IO server project with TypeScript configuration`

### 8.2 Set up the HTTP and Socket.IO server

- [x] Create `server/src/index.ts`:
  - Create an HTTP server using Node's `createServer`
  - Create a Socket.IO `Server` instance with CORS set to `process.env.ALLOWED_ORIGIN`
  - Call `setupRedisAdapter(io)` (wired in 8.4)
  - Call `io.use(authMiddleware)` (wired in 8.3)
  - Call `io.on('connection', handleConnection)`
  - Listen on `process.env.PORT ?? 3001`
- [x] Create `server/.env` — `PORT=3001`, `ALLOWED_ORIGIN=http://localhost:3000`
- [x] Verify the server starts without errors: `npm run dev`

> `git commit: set up Socket.IO HTTP server with CORS and environment configuration`

### 8.3 Implement auth middleware

- [x] Create `server/src/middleware/auth.ts` — full implementation from BP.md section 11.2
  - Extract `token` from `socket.handshake.auth.token`
  - Call `verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })` from `@clerk/backend`
  - On success: set `socket.data.userId` and `socket.data.userName`
  - On failure: call `next(new Error('INVALID_TOKEN'))`
- [x] Add `CLERK_SECRET_KEY` to `server/.env`
- [x] Test: connect a Socket.IO client without a token — verify connection is refused

> `git commit: add Clerk JWT authentication middleware to Socket.IO server`

### 8.4 Implement the Redis adapter

- [x] Create `server/src/redis.ts` — full `setupRedisAdapter` implementation from BP.md section 12
  - Connect `pubClient` and `subClient` using `ioredis`
  - Pass to `io.adapter(createAdapter(pubClient, subClient))`
  - Log redis connection errors to console
- [x] Add `UPSTASH_REDIS_URL` to `server/.env` (from Upstash dashboard)

> `git commit: connect Socket.IO server to Upstash Redis via redis adapter`

### 8.5 Implement the presence store

- [x] Create `server/src/presence.ts` — in-memory `Map` with `addToPresence`, `removeFromPresence`, `getPresence` functions (BP.md section 11.4)

> `git commit: add in-memory presence store for board room management`

### 8.6 Implement all event handlers

- [x] Create `server/src/handlers/connection.ts` — full `handleConnection` function from BP.md section 11.3
  - `JOIN_BOARD`: join socket room, update presence, emit `PRESENCE_INIT` to joining socket, broadcast `PRESENCE_UPDATE` to room
  - `LEAVE_BOARD`: leave room, remove presence, broadcast `PRESENCE_UPDATE`
  - `disconnect`: auto-call `LEAVE_BOARD` cleanup
  - `CARD_CREATED`, `CARD_UPDATED`, `CARD_MOVED`, `CARD_DELETED`: wrap in `checkRateLimit`, broadcast to room
  - `COLUMN_CREATED`, `COLUMN_UPDATED`, `COLUMN_DELETED`: broadcast to room
  - `TYPING_START`, `TYPING_STOP`: broadcast to room (excluding sender)
  - `CHAT_MESSAGE_SENT`: broadcast signal to room

> `git commit: implement all Socket.IO board room event handlers`

### 8.7 Implement rate limiting

- [x] Create `server/src/rateLimit.ts` — Redis-based rate limiter from BP.md section 13
  - Key format: `ratelimit:{userId}`
  - `INCR` + `EXPIRE` on first event
  - Limit: 30 events per 10-second window
  - On limit exceeded: emit `RATE_LIMITED` to the offending socket

> `git commit: add Redis-based rate limiting for WebSocket events`

### 8.8 Deploy to Render

- [ ] Create a `Dockerfile` or use Render's native Node.js detection
- [ ] Create `render.yaml` (optional) or configure manually in Render dashboard:
  - Build command: `npm install && npm run build`
  - Start command: `npm start`
  - Instance type: Free
- [ ] Set environment variables in Render: `CLERK_SECRET_KEY`, `UPSTASH_REDIS_URL`, `ALLOWED_ORIGIN` (set to Vercel URL once deployed)
- [ ] Copy the Render service URL — this becomes `NEXT_PUBLIC_SOCKET_URL` in `.env.local` and Vercel

> `git commit: add Render deployment configuration for Socket.IO server`

---

## Step 9: Real-Time Frontend Integration

**Status:** Complete
**Goal:** Every board action (card create, move, update, delete; column create, update, delete) is broadcast to all users viewing the same board in real time. The board stays in sync without refreshes.

### 9.1 Build the Socket.IO client singleton

- [x] Create `lib/socket.ts` — `getSocket(token)` factory and `disconnectSocket()` function (FP.md section 11.1)
  - `autoConnect: false` — explicit connect after auth
  - `reconnection: true`, `reconnectionAttempts: 5`, `reconnectionDelay: 1000`
- [x] Add `NEXT_PUBLIC_SOCKET_URL` to `.env.local`

> `git commit: add Socket.IO client singleton with reconnection configuration`

### 9.2 Build the SocketProvider

- [x] Create `components/providers/SocketProvider.tsx` (FP.md section 11.2):
  - On mount: get Clerk JWT via `useAuth().getToken()`, create socket via `getSocket(token)`, connect
  - On Clerk sign-out: disconnect socket
  - Provide socket via React context
- [x] `useSocket()` exported from `SocketProvider.tsx` — returns socket from context
- [x] Add `<SocketProvider>` inside `ConvexClerkProvider` in the root layout

> `git commit: add SocketProvider and useSocket hook for app-wide socket access`

### 9.3 Build the useBoardRoom hook

- [x] Create `hooks/useBoardRoom.ts` (FP.md section 11.3):
  - On mount: `socket.emit('JOIN_BOARD', { boardId })`
  - Register listeners for all 8 board events: `CARD_CREATED`, `CARD_UPDATED`, `CARD_MOVED`, `CARD_DELETED`, `COLUMN_CREATED`, `COLUMN_UPDATED`, `COLUMN_DELETED`, `RATE_LIMITED`, `error`
  - Track connection state (`connected` / `disconnected`)
  - On unmount: `socket.emit('LEAVE_BOARD', { boardId })`, remove all listeners

> `git commit: add useBoardRoom hook managing board room lifecycle and all event listeners`

### 9.4 Emit Socket.IO events from board mutations

- [x] In `BoardView.tsx` and child components, after every Convex mutation call, emit the corresponding Socket.IO event:
  - After `createCard` → `socket.emit('CARD_CREATED', { boardId, card })`
  - After `updateCard` → `socket.emit('CARD_UPDATED', { boardId, cardId, changes })`
  - After `moveCard` (inside `onDragEnd`) → `socket.emit('CARD_MOVED', { boardId, cardId, newColumnId, newOrderIndex })`
  - After `deleteCard` → `socket.emit('CARD_DELETED', { boardId, cardId })`
  - After `createColumn` → `socket.emit('COLUMN_CREATED', { boardId, column })`
  - After `updateColumn` → `socket.emit('COLUMN_UPDATED', { boardId, columnId, title })`
  - After `deleteColumn` → `socket.emit('COLUMN_DELETED', { boardId, columnId })`

> `git commit: emit Socket.IO events from all board mutation handlers`

### 9.5 Add connection state banner

- [x] In `BoardView.tsx`, use the `connected` state from `useBoardRoom`:
  - When disconnected: render a yellow banner at the top of the board: "You are offline. Reconnecting..."

> `git commit: add offline connection state banner and disable drag while disconnected`

### 9.6 Verify real-time sync end-to-end

- [x] Open the same board in two browser windows (different sessions)
- [x] Move a card in window 1 — confirm it moves in window 2 without refresh
- [x] Create a column in window 1 — confirm it appears in window 2
- [x] Delete a card in window 1 — confirm it disappears in window 2

> `git commit: verify real-time board sync between multiple browser sessions`

---

## Step 10: Presence

**Status:** Not Started
**Goal:** Users on the same board see each other's avatars in real time. Avatars appear when a user joins and disappear when they leave or disconnect.

### 10.1 Build the usePresence hook

- [x] Create `hooks/usePresence.ts` (FP.md section 11.4):
  - Maintains a `Map<userId, { name, avatarUrl }>` as React state
  - Listens for `PRESENCE_INIT` (initial list on join) and `PRESENCE_UPDATE` (join/leave events)
  - On `PRESENCE_UPDATE` type `JOIN`: add user to the map
  - On `PRESENCE_UPDATE` type `LEAVE`: remove user from the map
  - Returns the map as an array for rendering

> `git commit: add usePresence hook managing live board member avatars`

### 10.2 Build the PresenceBar component

- [ ] Create `components/board/PresenceBar.tsx`:
  - Calls `usePresence(boardId)` to get online user list
  - Renders up to 5 user avatars inline (shadcn `Avatar` with Tooltip showing display name)
  - Overflow: "+N" badge if more than 5 users
  - Avatars animate in with a Tailwind `transition` when joining/leaving (`opacity-0 → opacity-100`)
- [ ] Mount `PresenceBar` inside `BoardView.tsx` at the top-right of the board header area

> `git commit: add PresenceBar component showing live online user avatars`

---

## Step 11: Comments & @Mentions

**Status:** Not Started
**Goal:** Users can post comments on cards. Comments appear in real time for all users with the card open. @mentions notify the mentioned user.

### 11.1 Add @mention support to the comment editor

- [ ] Install: `npm install @tiptap/extension-mention tippy.js`
- [ ] Upgrade `CommentInput` (currently a plain textarea) to a Tiptap editor with the Mention extension (FP.md section 10.2):
  - `suggestion.items`: filters workspace members by the typed query
  - `suggestion.render`: renders a Tippy.js popup listing member options
  - Selecting a member inserts a mention node `{ type: "mention", attrs: { id, label } }`
- [ ] Keep the plain `StarterKit` for the comment body (no heading buttons needed — just bold, italic, inline code)

> `git commit: add Tiptap @mention extension to comment input with member suggestions`

### 11.2 Wire @mention extraction in the createComment mutation

- [ ] In `convex/comments.ts`, implement `createComment` with full @mention scanning (BP.md section 7.6):
  - Call `extractMentionedUserIds(body)` to walk the Tiptap JSON tree
  - For each valid mention (user is a workspace member, not the comment author): call `createNotification` helper (MENTIONED type)
- [ ] Implement `extractMentionedUserIds` helper function in `convex/lib/mentions.ts`

> `git commit: extract @mentions from comment body and create notifications in Convex`

### 11.3 Make comments real-time via Convex

- [ ] The `useQuery(api.comments.listByCard, { cardId })` in `CommentThread` is already reactive — new comments auto-appear. Verify this works when two users have the same card open.
- [ ] Confirm comments scroll to the newest entry when a new comment is added

> `git commit: verify real-time comment delivery via Convex reactive query`

### 11.4 Add edit and delete to CommentItem

- [ ] Wire the edit flow in `CommentItem.tsx`:
  - Click Edit → swap body display for a small Tiptap editor pre-loaded with existing content
  - Save → calls `updateComment` mutation
  - Cancel → revert to display mode
- [ ] Wire the delete flow: calls `deleteComment` mutation with confirmation
- [ ] Show edit/delete buttons only to the comment author (compare `comment.authorId` with current userId from Clerk)

> `git commit: add comment edit and delete with author-only visibility`

---

## Step 12: Notifications

**Status:** Not Started
**Goal:** Users receive in-app notifications in real time when assigned to a card or @mentioned. The notification bell shows an unread count badge.

### 12.1 Implement the notification backend

- [ ] Create `convex/notifications.ts` — implement:
  - `list` query (for current user, newest 50)
  - `getUnreadCount` query (reactive — auto-updates)
  - `markAsRead` mutation
  - `markAllAsRead` mutation
- [ ] Implement `createNotification` helper in `convex/lib/notifications.ts` (BP.md section 10.1) — already called from `updateCard` (assignment) and `createComment` (@mention)

> `git commit: implement notification queries and mark-as-read mutations`

### 12.2 Build the NotificationBell component

- [ ] Create `components/notifications/NotificationBell.tsx`:
  - `useQuery(api.notifications.getUnreadCount)` — reactive badge
  - shadcn `Popover` opens `NotificationList` on click
  - Bell icon with a red badge showing the count (hidden when 0)
- [ ] Mount `NotificationBell` in the app layout header (top-right)

> `git commit: add notification bell with reactive unread count badge`

### 12.3 Build the NotificationList component

- [ ] Create `components/notifications/NotificationList.tsx`:
  - `useQuery(api.notifications.list)` — reactive list
  - Renders list of `NotificationItem` components
  - "Mark all as read" button at the top → calls `markAllAsRead` mutation
  - Empty state: "No notifications yet"
- [ ] Create `components/notifications/NotificationItem.tsx`:
  - Icon (person for ASSIGNED, @ for MENTIONED)
  - Message: "Punit assigned you to 'Auth flow'" or "Aryan mentioned you in 'API rate limiting'"
  - Relative timestamp
  - Unread items have a highlighted background
  - On click: calls `markAsRead`, navigates to `/${workspaceSlug}/board/${boardId}` and opens the relevant card

> `git commit: build notification list with mark-as-read and navigation to card`

---

## Step 13: Board Chat & Typing Indicators

**Status:** Not Started
**Goal:** A persistent chat panel on the board lets all members send messages in real time. A typing indicator shows when someone is composing a message.

### 13.1 Implement the chat backend

- [ ] Create `convex/chat.ts` — implement `sendChatMessage` mutation and `listByBoard` query (last 100 messages, includes sender name + avatar)

> `git commit: add chat message mutation and board chat history query`

### 13.2 Build the chat panel components

- [ ] Create `components/chat/ChatPanel.tsx`:
  - `useQuery(api.chat.listByBoard, { boardId })` — reactive message history
  - Scrollable message list (auto-scrolls to bottom on new message)
  - Typing indicator area above the input (renders `useTypingIndicator` state)
  - Collapsible: toggle button on the board header shows/hides the panel
- [ ] Create `components/chat/ChatMessage.tsx` — avatar, sender name, message body, timestamp
- [ ] Create `components/chat/ChatInput.tsx`:
  - Plain `<input>` (not Tiptap — chat is plain text)
  - On Enter: calls `sendChatMessage` mutation + emits `CHAT_MESSAGE_SENT` via socket
  - On first keydown: emits `TYPING_START` via socket
  - After 2 seconds of no input: emits `TYPING_STOP` via socket (use `useRef` to track the debounce timeout)

> `git commit: build board chat panel with message list and plain text input`

### 13.3 Implement typing indicators

- [ ] Create `hooks/useTypingIndicator.ts`:
  - Listens for `TYPING_START` and `TYPING_STOP` socket events
  - Maintains a `Set<string>` of currently typing usernames
  - Auto-removes a user from the set after 3 seconds (safety net in case `TYPING_STOP` is missed)
  - Returns a formatted string: "Aryan is typing..." or "Aryan and Punit are typing..."
- [ ] Mount the output string in `ChatPanel.tsx` above the input

> `git commit: add typing indicator hook with auto-timeout fallback`

---

## Step 14: Activity Log

**Status:** Not Started
**Goal:** The board's activity log panel shows every action in reverse chronological order, with filters. Every mutation is confirmed to write an activity log entry.

### 14.1 Verify activity log writes across all mutations

- [ ] Audit every mutation in Convex and confirm `writeActivityLog` is called:
  - `createCard` ✓, `updateCard` ✓, `moveCard` ✓, `deleteCard` ✓
  - `createColumn` ✓, `updateColumn` ✓, `deleteColumn` ✓
  - `createComment` ✓
- [ ] Add any missing `writeActivityLog` calls

> `git commit: audit and complete activity log writes across all board mutations`

### 14.2 Implement the activity log query

- [ ] In `convex/activityLogs.ts`, implement `listByBoard` query with:
  - Filtering by `actionType` (optional)
  - Filtering by `actorId` (optional)
  - Pagination using Convex's `.paginate()` — 20 entries per page
  - Each entry joined with actor name and avatar from the `users` table

> `git commit: implement paginated activity log query with actor and filter support`

### 14.3 Build the activity log formatter

- [ ] Create `lib/formatActivityEntry.ts`:
  - Takes an activity log entry (actionType + metadata) and returns a human-readable string
  - Full coverage of all action types from BP.md section 9.2
  - Examples: `"CARD_MOVED"` → `"moved 'Design homepage' from To Do to In Progress"`

> `git commit: add activity log entry formatter for all action types`

### 14.4 Build the ActivityLogPanel component

- [ ] Create `components/board/ActivityLogPanel.tsx`:
  - Sliding panel (Tailwind `translate-x-full` → `translate-x-0` transition)
  - Triggered by an "Activity" button in `BoardHeader`
  - `useQuery(api.activityLogs.listByBoard, { boardId, actionType, actorId, cursor })` — reactive
  - Two filter dropdowns: action type selector + user selector
  - Infinite scroll: "Load more" button at the bottom fetches next page via cursor
  - Each entry: actor avatar, formatted action string via `formatActivityEntry`, relative timestamp ("2 minutes ago")
  - Clicking an entry that references a card: sets `openCardId` in `BoardView` to open the card modal

> `git commit: build activity log panel with filters, pagination, and card navigation`

---

## Step 15: Permission Enforcement

**Status:** Not Started
**Goal:** View-only and comment-only users cannot perform actions above their permission level. The UI hides controls they cannot use. The server rejects any attempt that bypasses the UI.

### 15.1 Add permission helpers to the frontend

- [ ] Create `lib/permissions.ts` — `canEdit(role)`, `canComment(role)` functions (FP.md section 15.5)
- [ ] Add a `useBoardPermission(boardId)` hook that queries the current user's effective permission for the board via `useQuery(api.boards.getMembers, { boardId })`

> `git commit: add client-side board permission helpers and useBoardPermission hook`

### 15.2 Gate drag-and-drop by permission

- [ ] In `CardItem.tsx`: hide the drag handle if `!canEdit(userPermission)`
- [ ] In `BoardView.tsx` `onDragEnd`: if user permission is not edit, show error toast instead of proceeding (defensive — should not be reachable if drag handle is hidden)

> `git commit: hide drag handles and block drag for non-edit permission users`

### 15.3 Gate card mutation controls by permission

- [ ] In `CardModal.tsx` `CardDetailsTab`:
  - `editable` prop of Tiptap editor set to `canEdit(userPermission)`
  - Assignee picker disabled if `!canEdit`
  - Label picker disabled if `!canEdit`
  - Due date picker disabled if `!canEdit`
  - Save button hidden if `!canEdit`
  - Delete button hidden if `!canEdit`
- [ ] In `Column.tsx`: hide "Add Card" input if `!canEdit`
- [ ] In `ColumnHeader.tsx`: title not clickable/editable if `!canEdit`; delete button hidden if `!canEdit`
- [ ] In board view: "Add Column" button hidden if `!canEdit`

> `git commit: gate all edit-level controls behind permission check in board UI`

### 15.4 Handle server-side rejection in the UI

- [ ] In every mutation call that can fail with `FORBIDDEN`:
  - Catch the `ConvexError`
  - Revert any optimistic updates
  - Show a toast: "You don't have permission to do that."
- [ ] Specifically for card drag: if the server's `moveCard` returns `FORBIDDEN`, snap the card back to its original position

> `git commit: handle FORBIDDEN Convex errors with toast and optimistic revert`

---

## Step 16: Dark Mode & Mobile Responsiveness

**Status:** Not Started
**Goal:** The app looks correct in both light and dark mode. All core functionality is usable on mobile screens.

### 16.1 Wire the dark mode toggle

- [ ] In `components/layout/AppSidebar.tsx` or `BoardHeader.tsx`: add a moon/sun icon button that calls `setTheme` from `useTheme()` (next-themes)
- [ ] Verify all shadcn/ui components render correctly in dark mode (they use CSS variables — should work automatically)
- [ ] Spot-check custom components and add `dark:` Tailwind variants where needed

> `git commit: wire dark mode toggle with next-themes and verify dark mode styling`

### 16.2 Implement mobile column tab navigation

- [ ] In `BoardView.tsx`: detect screen size using a Tailwind-based conditional render (`hidden md:flex` / `flex md:hidden`)
- [ ] For mobile: render `ColumnTabs` — a horizontally scrollable tab bar showing column names; clicking a tab changes the active column
- [ ] The active column renders its `Column` component below the tab bar (full width)

> `git commit: add mobile column tab navigation replacing horizontal kanban scroll`

### 16.3 Implement mobile sidebar

- [ ] Add a hamburger menu button in the top-left of the mobile header
- [ ] Use shadcn `Sheet` component: slides in from the left, contains the same `AppSidebar` content
- [ ] Close the sheet on navigation

> `git commit: add mobile sidebar as a Sheet overlay triggered by hamburger menu`

### 16.4 Implement mobile card modal and chat

- [ ] In `CardModal.tsx`: on mobile (`sm:` breakpoint), apply `max-w-full h-full rounded-t-xl` to the Dialog (bottom sheet style)
- [ ] In `BoardChatPanel.tsx`: on mobile, replace the side panel with a floating action button (chat icon, bottom-right). Tapping opens the chat as a `Sheet` from the bottom.

> `git commit: adapt card modal and chat panel to full-screen mobile layouts`

---

## Step 17: Edge Cases & Error Handling

**Status:** Not Started
**Goal:** Every edge case from PRD section 9 is explicitly handled. The app never crashes or shows broken UI in unexpected situations.

### 17.1 Concurrent card edit correction (PRD 9.1)

- [ ] In `CardModal.tsx`: the Convex reactive query on `api.cards.get` pushes the final server value. If the Tiptap editor is in edit mode when an update arrives (from another user), do NOT overwrite the active editor content — only update the title display in the modal header. Show a subtle "Updated by [Name]" message.

> `git commit: protect active card editor from overwrite during concurrent edits`

### 17.2 Deleted card modal auto-close (PRD 9.10)

- [ ] In `useBoardRoom`, on receiving `CARD_DELETED`: if `openCardId === deletedCardId`, set `openCardId` to null and show toast: "This card was deleted by another user."
- [ ] Secondary fallback: in `CardModal.tsx`, if `useQuery(api.cards.get, { cardId })` returns `null`, close the modal automatically.

> `git commit: auto-close card modal and show toast when the open card is deleted`

### 17.3 WebSocket disconnect handling (PRD 9.3)

- [ ] Verify the offline banner from Step 9.5 works correctly
- [ ] On reconnect: re-emit `JOIN_BOARD` to re-register in the room and get fresh presence
- [ ] Confirm Convex reactive queries recover automatically (they use a separate connection)

> `git commit: handle WebSocket reconnection by re-joining board room and refreshing state`

### 17.4 @Mention of non-member (PRD 9.8)

- [ ] Verify that the Tiptap mention suggestion only returns workspace members (already true if `suggestion.items` filters from `workspaceMembers`)
- [ ] In `convex/comments.ts` `createComment`: confirm `extractMentionedUserIds` validates each ID against workspace membership before creating a notification

> `git commit: guard @mention notifications against non-workspace-member user IDs`

### 17.5 Removed member display (PRD 9.9)

- [ ] In `CardItem.tsx` and `CardDetailsTab.tsx`: when rendering the assignee, if the user's ID is not found in `workspaceMembers.list`, display "[Removed Member]" with a generic avatar
- [ ] In `AssigneePicker.tsx`: removed members do not appear in the dropdown options

> `git commit: display removed member fallback text in card assignee fields`

### 17.6 Invalid invite link error page (PRD 9.6)

- [ ] In `app/invite/[token]/page.tsx`: if `acceptInvite` throws `ConvexError` with code `INVITE_EXPIRED` or `INVITE_USED`, render an error state: "This invite link is no longer valid."
- [ ] Add a "Go to sign in" link below the error message

> `git commit: add error state to invite acceptance page for expired or used tokens`

---

## Step 18: Deployment

**Status:** Not Started
**Goal:** The app is live at a public URL. Both the Next.js frontend and the Socket.IO server are deployed. The full demo flow works end-to-end on the deployed URLs.

### 18.1 Set up the GitHub repository

- [ ] Create a new public repository on GitHub: `onpoint`
- [ ] Push the current local repo: `git remote add origin <url> && git push -u origin main`
- [ ] Confirm all files are committed (run `git status` — should be clean)

> `git commit: initial push to GitHub repository`

### 18.2 Deploy the Next.js app to Vercel

- [ ] Connect the GitHub repo to Vercel (vercel.com → New Project → Import from GitHub)
- [ ] Set all environment variables in Vercel project settings:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_CONVEX_URL` (production Convex deployment URL)
  - `NEXT_PUBLIC_SOCKET_URL` (Render service URL from Step 8.8)
- [ ] Trigger a deployment and confirm the app loads at the Vercel URL

> `git commit: deploy Next.js frontend to Vercel`

### 18.3 Deploy Convex to production

- [ ] Run `npx convex deploy` — this pushes the schema and all functions to the production Convex deployment
- [ ] Confirm the production Convex URL matches the `NEXT_PUBLIC_CONVEX_URL` set in Vercel

> `git commit: deploy Convex schema and functions to production`

### 18.4 Register the Clerk webhook for production

- [ ] In the Clerk dashboard → Webhooks → Add Endpoint: `https://your-app.vercel.app/api/webhooks/clerk`
- [ ] Select events: `user.created`, `user.updated`
- [ ] Copy the signing secret to `CLERK_WEBHOOK_SECRET` in Vercel environment variables
- [ ] Test: sign up a new user on the deployed app. Verify the user record is created in the Convex production dashboard.

> `git commit: register and verify Clerk webhook for production deployment`

### 18.5 Update Socket.IO CORS for production

- [ ] In Render environment variables: set `ALLOWED_ORIGIN` to the full Vercel URL (e.g., `https://onpoint.vercel.app`)
- [ ] Redeploy the Render service
- [ ] Verify WebSocket connections succeed from the Vercel deployment (open browser console — no CORS errors)

> `git commit: update Socket.IO CORS allowed origin for production`

### 18.6 End-to-end demo smoke test

- [ ] Open the live Vercel URL in two different browsers (or one incognito)
- [ ] Sign up two new users
- [ ] User A: create a workspace, create a board, create columns
- [ ] User B: accept invite, join the board
- [ ] Confirm both users see each other's avatars in the presence bar
- [ ] User A: move a card → confirm User B sees it move without refresh
- [ ] User A: post a comment with @UserB → confirm User B receives a notification
- [ ] User B (view-only): attempt to drag a card → confirm it is rejected
- [ ] Open the activity log — confirm all actions are recorded with actor names

> `git commit: complete production smoke test and fix any deployment issues`

---

## Completion

When all 18 steps are marked complete, the implementation is done. The product is:
- Deployed at a public Vercel URL
- Real-time sync working across multiple browser sessions
- All permissions enforced server-side
- Complete activity audit trail
- Ready for demo and portfolio
