# Testing Plan: OnPoint

**Version 1.0 | March 2026**
**References:** IMPLEMENTATION_PLAN.md · FP.md · BP.md · PRD.md · SECURITY_AND_OPERATIONS.md

---

## ⚠️ Critical Rule

**A step is NOT done until every test in that step passes.**

The implementation plan says mark `[x]` when code is written. This document says mark `[x]` when the test passes. Both must be true before moving to the next step. If a test fails, fix the code — do not skip the test.

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Categories](#2-test-categories)
3. [Testing Framework Setup](#3-testing-framework-setup)
4. [Step 1: Project Foundation](#step-1-project-foundation)
5. [Step 2: Authentication & User Sync](#step-2-authentication--user-sync)
6. [Step 3: Workspace Layer](#step-3-workspace-layer)
7. [Step 4: Backend Data Layer](#step-4-backend-data-layer)
8. [Step 5: Board View — Static UI](#step-5-board-view--static-ui)
9. [Step 6: Card Modal](#step-6-card-modal)
10. [Step 7: Drag-and-Drop](#step-7-drag-and-drop)
11. [Step 8: Socket.IO Server](#step-8-socketio-server)
12. [Step 9: Real-Time Frontend Integration](#step-9-real-time-frontend-integration)
13. [Step 10: Presence](#step-10-presence)
14. [Step 11: Comments & @Mentions](#step-11-comments--mentions)
15. [Step 12: Notifications](#step-12-notifications)
16. [Step 13: Board Chat & Typing Indicators](#step-13-board-chat--typing-indicators)
17. [Step 14: Activity Log](#step-14-activity-log)
18. [Step 15: Permission Enforcement](#step-15-permission-enforcement)
19. [Step 16: Dark Mode & Mobile Responsiveness](#step-16-dark-mode--mobile-responsiveness)
20. [Step 17: Edge Cases & Error Handling](#step-17-edge-cases--error-handling)
21. [Step 18: Deployment](#step-18-deployment)
22. [Global Acceptance Criteria](#22-global-acceptance-criteria)

---

## 1. Testing Philosophy

### Three Verification Layers

Every step uses three complementary layers of testing. No single layer is sufficient on its own.

**Layer 1 — Automated Tests**
Code that runs automatically and gives a binary pass/fail result. These are the fastest feedback loop. Automated tests catch regressions and verify logic correctness. They cannot verify visual output, real-time behavior, or anything that requires a live browser.

**Layer 2 — Manual Tests**
Tests you perform yourself in the browser. These catch visual bugs, UX flows, and anything that requires human judgment. They also catch integration problems that unit tests miss because they exercise the full system together. Some manual tests require two browser windows open simultaneously.

**Layer 3 — Claude-Side Verification**
Programmatic checks that Claude performs by reading the code — verifying that specific patterns are present, that security rules are followed, that critical invariants are upheld. These checks run before you proceed to the next step. They are fast and require no server running.

### Fail Loudly, Fix Before Continuing

If any test fails:
1. Stop. Do not proceed to the next substep.
2. Read the error carefully.
3. Fix the root cause (not the symptom).
4. Rerun the test. Confirm it passes.
5. Only then continue.

### Two-Browser Requirement (Steps 9–17)

From Step 9 onward, many tests require two separate browser sessions. Use either:
- Two different browsers (Chrome + Firefox)
- One normal window + one incognito window
- Two different user accounts signed in simultaneously

Label them **User A** (the primary actor) and **User B** (the observer confirming real-time delivery).

---

## 2. Test Categories

Each test in this document is tagged with one of these labels:

| Tag | Meaning |
|-----|---------|
| `[AUTO]` | Automated test — runs via Jest/Vitest |
| `[MANUAL]` | Manual test — performed in the browser |
| `[CLAUDE]` | Claude reads the code and verifies the pattern |
| `[CONVEX]` | Tested using the Convex dashboard function runner |
| `[SECURITY]` | Security-critical test — must not be skipped |
| `[E2E]` | End-to-end test requiring the full system running |

---

## 3. Testing Framework Setup

Before writing any application code, set up the testing infrastructure. Do this once as part of Step 1.

### 3.1 Install Testing Dependencies

```bash
# Unit/integration testing
npm install -D jest @jest/globals jest-environment-jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D ts-jest

# E2E testing
npm install -D @playwright/test
npx playwright install chromium firefox
```

### 3.2 Configure Jest

**File:** `jest.config.ts`

```ts
import type { Config } from 'jest'
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
}
export default config
```

**File:** `jest.setup.ts`

```ts
import '@testing-library/jest-dom'
```

### 3.3 Configure Playwright

**File:** `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox',  use: { browserName: 'firefox' } },
  ],
})
```

### 3.4 Add Test Scripts to package.json

```json
"scripts": {
  "test":       "jest",
  "test:watch": "jest --watch",
  "test:e2e":   "playwright test",
  "test:all":   "jest && playwright test"
}
```

### 3.5 Create Test Folder Structure

```
__tests__/
  unit/
    lib/
    convex/
  components/
e2e/
  auth.spec.ts
  workspace.spec.ts
  board.spec.ts
  realtime.spec.ts
  permissions.spec.ts
```

### Acceptance Criteria for Setup

- [ ] `npm test` runs without errors (zero tests collected is acceptable at this stage)
- [ ] `npx playwright test` installs browsers and runs with 0 failures (no test files yet)
- [ ] `__tests__/` and `e2e/` folders exist in the project root

---

## Step 1: Project Foundation

### 1.1 Automated Tests

**`[AUTO]`** TypeScript compiles without errors:
```bash
npx tsc --noEmit
# Expected: exits with code 0, no output
```

**`[AUTO]`** Tailwind configuration has `darkMode: 'class'`:
```bash
# Claude reads tailwind.config.ts and confirms: darkMode: 'class'
```

**`[AUTO]`** All expected shadcn components exist in `components/ui/`:
```bash
ls components/ui/
# Expected: button.tsx, dialog.tsx, alert-dialog.tsx, popover.tsx, command.tsx,
#           calendar.tsx, tabs.tsx, tooltip.tsx, toast.tsx, avatar.tsx,
#           badge.tsx, sheet.tsx, separator.tsx, input.tsx, textarea.tsx,
#           label.tsx — all present
```

### 1.2 Manual Tests

**`[MANUAL]`** The app boots and renders at `localhost:3000`:
- Run `npm run dev`
- Open browser at `http://localhost:3000`
- Expected: page loads with no errors in the browser console
- Expected: no `500` or `404` responses in the network tab

**`[MANUAL]`** Convex schema deploys successfully:
- Open the Convex dashboard (from `npx convex dev`)
- Navigate to the Data tab
- Expected: all 12 tables appear: `users`, `workspaces`, `workspaceMembers`, `workspaceInvites`, `boards`, `boardMembers`, `columns`, `cards`, `cardLabels`, `comments`, `activityLogs`, `notifications`, `chatMessages`, `cardHistory`

**`[MANUAL]`** Clerk loads correctly:
- Open `localhost:3000/sign-in`
- Expected: Clerk's sign-in UI renders (not a blank page or error)

### 1.3 Claude-Side Verification

**`[CLAUDE]`** Provider order in `app/layout.tsx` is correct:
- Read `app/layout.tsx`
- Confirm order is: `ThemeProvider` wraps `ConvexClerkProvider` wraps `{children}`
- If reversed: dark mode will break in SSR

**`[CLAUDE]`** `.env.local` is in `.gitignore`:
- Read `.gitignore`
- Confirm `.env.local` is listed
- This must be true BEFORE any secrets are added

**`[CLAUDE]`** No `NEXT_PUBLIC_` variables contain secrets:
- Read `.env.local`
- Confirm `CLERK_SECRET_KEY` does NOT have `NEXT_PUBLIC_` prefix
- Confirm `CLERK_WEBHOOK_SECRET` does NOT have `NEXT_PUBLIC_` prefix

**`[CLAUDE]`** Convex schema has all required indexes:
- Read `convex/schema.ts`
- Confirm `users` has `by_clerk_id` index
- Confirm `workspaceMembers` has `by_workspace_and_user` index
- Confirm `boardMembers` has `by_board_and_user` index
- Confirm `workspaceInvites` has `by_token` index

### 1.4 Security Tests

**`[SECURITY]`** `[CLAUDE]` `.gitignore` prevents secret files from being committed:
- Confirm `.env.local`, `.env`, `server/.env`, `*.pem` are all in `.gitignore`
- Run `git status` — confirm none of these files appear as untracked

### 1.5 Acceptance Criteria

A step is done when **all** of these are true:

- [ ] `npm run dev` starts without errors
- [ ] `npx tsc --noEmit` exits with code 0
- [ ] All 12 Convex tables visible in dashboard
- [ ] All shadcn components exist in `components/ui/`
- [ ] Provider order in `layout.tsx` is correct
- [ ] `.env.local` is in `.gitignore` and confirmed before adding secrets

---

## Step 2: Authentication & User Sync

### 2.1 Automated Tests

**`[AUTO]`** `requireUser` throws `UNAUTHENTICATED` when no identity:

Create `__tests__/unit/convex/auth.test.ts`:
```ts
// Test that requireUser throws when ctx.auth.getUserIdentity() returns null
// Mock the ctx with null identity
// Expected: ConvexError with code 'UNAUTHENTICATED' is thrown
```

**`[AUTO]`** Webhook route returns 400 on missing svix headers:

Create `__tests__/unit/api/webhook.test.ts`:
```ts
// POST to /api/webhooks/clerk with no svix headers
// Expected: response.status === 400
// Expected: response body contains "Missing required Svix headers"
```

**`[AUTO]`** Webhook route returns 400 on invalid signature:
```ts
// POST to /api/webhooks/clerk with tampered body
// Expected: response.status === 400 (svix verification fails)
```

### 2.2 Manual Tests

**`[MANUAL]`** Email sign-up creates a user record in Convex:
1. Open `localhost:3000/sign-up`
2. Enter a real email and password and submit
3. Open the Convex dashboard → Data → `users` table
4. Expected: a row appears with the correct email and name
5. Expected: `clerkId` matches the user's Clerk ID (visible in Clerk dashboard)

**`[MANUAL]`** Google OAuth sign-in works:
1. Open `localhost:3000/sign-in`
2. Click "Continue with Google"
3. Complete the Google sign-in flow
4. Expected: redirected to `/onboarding`
5. Expected: user record exists in Convex `users` table

**`[MANUAL]`** First-time user is routed to onboarding:
1. Sign up as a brand-new user
2. Expected: immediately redirected to `/onboarding`
3. Expected: onboarding page shows two options: "Create a workspace" and "Join a workspace"

**`[MANUAL]`** Returning user with existing workspace skips onboarding:
1. Sign in as a user who already has a workspace
2. Expected: redirected directly to `/${workspaceSlug}` — NOT to `/onboarding`

**`[MANUAL]`** Unauthenticated access to app routes is blocked:
1. Sign out
2. Try to navigate directly to `localhost:3000/some-workspace`
3. Expected: redirected to `/sign-in`

**`[MANUAL]`** Webhook syncs `user.updated` event:
1. In the Clerk dashboard, change a user's display name
2. Trigger the webhook (via Clerk dashboard → Webhooks → Test)
3. Open Convex dashboard → `users` table
4. Expected: the user's `name` field is updated to match

### 2.3 Claude-Side Verification

**`[CLAUDE]`** `createUser` is declared as `internalMutation` (not `mutation`):
- Read `convex/users.ts`
- Confirm: `export const createUser = internalMutation({`
- If it is `mutation`: it is callable by browser clients — a critical security flaw

**`[CLAUDE]`** Webhook handler verifies the svix signature before reading the body:
- Read `app/api/webhooks/clerk/route.ts`
- Confirm: `wh.verify(body, headers)` is called BEFORE any `evt.data` is accessed
- Confirm: the route reads raw body text (not `req.json()`) to preserve the signature

**`[CLAUDE]`** `requireUser` is called at the start of `getMe` and `updateUser`:
- Read `convex/users.ts`
- Confirm: first line of each mutation body calls `requireUser`

**`[CLAUDE]`** Onboarding redirect logic runs server-side (not client-side):
- Read `app/(app)/layout.tsx`
- Confirm: uses Clerk's `auth()` (server) or `getAuth()` (server), not `useAuth()` (client)
- Client-side-only redirect can be bypassed by disabling JavaScript

### 2.4 Security Tests

**`[SECURITY]`** `[MANUAL]` Webhook cannot be called without the correct signature:
1. Send a raw POST to `http://localhost:3000/api/webhooks/clerk` with no headers
2. Expected: `400 Bad Request` — not `200`
3. If it returns `200` with no headers: the signature verification is missing

**`[SECURITY]`** `[MANUAL]` Webhook cannot inject arbitrary user records:
1. Attempt to call `createUser` directly from the Convex dashboard function runner as a client
2. Expected: function is not listed as callable (it is `internalMutation`)

### 2.5 Acceptance Criteria

- [ ] Email sign-up creates a Convex user record
- [ ] Google OAuth sign-up creates a Convex user record
- [ ] First-time users land on `/onboarding`
- [ ] Returning users bypass onboarding
- [ ] Unauthenticated requests to `/(app)` routes redirect to sign-in
- [ ] `createUser` confirmed as `internalMutation`
- [ ] Webhook signature verified before body is read
- [ ] Webhook returns `400` without svix headers

---

## Step 3: Workspace Layer

### 3.1 Automated Tests

**`[AUTO]`** Slug generation produces URL-safe strings:

Create `__tests__/unit/lib/slug.test.ts`:
```ts
// slugify("My Team!") → "my-team"
// slugify("  spaces  ") → "spaces"
// slugify("Hello World 2") → "hello-world-2"
// slugify("") → throws or returns empty string (to be caught upstream)
// slugify("UPPERCASE") → "uppercase"
```

**`[AUTO]`** Invite token is a valid UUID:
```ts
// createInvite generates a token via crypto.randomUUID()
// token.match(/^[0-9a-f-]{36}$/) → true
// Confirm token is 36 characters long (UUID v4 format)
```

**`[AUTO]`** `assertWorkspaceRole` throws `FORBIDDEN` when rank is insufficient:
```ts
// guest cannot perform admin-level action
// member cannot perform admin-level action
// admin can perform admin-level action
// owner can perform all actions
```

### 3.2 Manual Tests

**`[MANUAL]`** Create a workspace:
1. Sign in and reach the onboarding page
2. Enter workspace name "Test Team" and submit
3. Expected: redirected to `/test-team` dashboard
4. Expected: workspace appears in the Convex `workspaces` table with correct slug
5. Expected: caller's `workspaceMembers` row has `role: 'owner'`

**`[MANUAL]`** Duplicate workspace name gets a suffix:
1. Create a workspace named "Test Team" (slug: `test-team`)
2. Sign in as a different user, also create "Test Team"
3. Expected: second workspace gets slug `test-team-2` (not a collision error)

**`[MANUAL]`** Invite link flow:
1. As workspace owner, open workspace settings
2. Click "Invite Member" → enter an email → copy the invite link
3. Open the link in a new browser session (different user)
4. Expected: page shows "You've been invited to join [workspace name]"
5. Click "Accept Invitation"
6. Expected: user is added to `workspaceMembers` with correct role
7. Expected: redirected to the workspace dashboard

**`[MANUAL]`** Expired invite link is rejected:
1. Create an invite link
2. In Convex dashboard, manually set `expiresAt` to a past timestamp for that invite record
3. Click the link
4. Expected: error page: "This invite link is no longer valid."

**`[MANUAL]`** Used invite link cannot be accepted twice:
1. Accept an invite link
2. Attempt to click the same link again (in a new session or different user)
3. Expected: error — link shows as already used

**`[MANUAL]`** App shell renders correctly:
1. Sign in and navigate to any workspace
2. Expected: sidebar appears with the workspace name
3. Expected: navigation links are present
4. Expected: user avatar + name appears in the bottom user menu
5. Click "Sign Out" in the user menu
6. Expected: redirected to `/sign-in`

**`[MANUAL]`** Workspace settings — role change:
1. Open workspace settings (as owner)
2. Change a member's role from "member" to "admin"
3. Expected: role selector updates immediately (reactive)
4. Expected: `workspaceMembers` row in Convex shows new role

**`[MANUAL]`** Member removal:
1. Remove a member from the workspace
2. Expected: member disappears from the member list
3. Expected: their board-level permission overrides (`boardMembers`) are also deleted
4. Expected: removed member can no longer access the workspace

### 3.3 Claude-Side Verification

**`[CLAUDE]`** `acceptInvite` checks both expiry AND `usedAt` before accepting:
- Read `convex/workspaces.ts` `acceptInvite` handler
- Confirm: `expiresAt > Date.now()` check exists
- Confirm: `usedAt === undefined` check exists
- Both must be checked — missing either one is a security flaw

**`[CLAUDE]`** `deleteWorkspace` cascade covers all child tables:
- Read `deleteWorkspace` mutation
- Confirm deletion order: notifications → chatMessages → activityLogs → cardHistory → comments → cardLabels → cards → columns → boardMembers → boards → workspaceMembers → workspaceInvites → workspace
- Reversing the order would leave orphan records

**`[CLAUDE]`** `removeMember` also deletes their `boardMembers` rows:
- Read `removeMember` mutation
- Confirm: after deleting from `workspaceMembers`, all `boardMembers` rows for that user in this workspace's boards are also deleted

**`[CLAUDE]`** Owner cannot be removed via `removeMember`:
- Read `removeMember` mutation
- Confirm: there is a guard `if (targetUser.role === 'owner') throw ConvexError(...)` or equivalent

### 3.4 Security Tests

**`[SECURITY]`** `[MANUAL]` Guest cannot create an invite:
1. Sign in as a workspace guest (role: `guest`)
2. Open workspace settings
3. Expected: "Invite Member" button is hidden OR calling `createInvite` returns `FORBIDDEN`
4. Confirm the server rejects the call even if the button is shown by mistake

**`[SECURITY]`** `[CONVEX]` `createInvite` called by a guest user:
1. In Convex dashboard, call `createInvite` with a guest user's Clerk JWT
2. Expected: ConvexError with code `FORBIDDEN`

### 3.5 Acceptance Criteria

- [ ] Create workspace works, slug is generated correctly
- [ ] Duplicate slugs auto-append suffix
- [ ] Invite link flow completes end-to-end
- [ ] Expired invite links are rejected
- [ ] Used invite links cannot be accepted again
- [ ] Member removal also removes board-level overrides
- [ ] `acceptInvite` checks both expiry and `usedAt`
- [ ] Guest cannot call `createInvite`

---

## Step 4: Backend Data Layer

### 4.1 Automated Tests

**`[AUTO]`** `computeOrderIndex` gap strategy:

Create `__tests__/unit/lib/orderIndex.test.ts`:
```ts
// Insert at end (no next card): prev=3000, next=undefined → 4000
// Insert at start (no prev card): prev=undefined, next=1000 → 0 (or negative: -1000)
// Insert between two cards: prev=1000, next=2000 → 1500
// Insert between adjacent cards (gap of 2): prev=1000, next=1002 → 1001 (triggers reindex)
// computeOrderIndex(1000, 1001) → 1000.5 (should trigger reindex when gap < 10)
```

**`[AUTO]`** Permission rank comparison:
```ts
// permRank = { edit: 3, comment: 2, view: 1 }
// edit satisfies edit, comment, and view requirements
// comment satisfies comment and view requirements, not edit
// view satisfies view requirement only
// null satisfies no requirement
```

**`[AUTO]`** `getEffectiveBoardPermission` priority: board override before workspace role:
```ts
// If boardMember override exists: return boardMember.permission
// If board is private and no boardMember override: return null
// If board is workspace-visible and wsMember is 'owner': return 'edit'
// If board is workspace-visible and wsMember is 'guest': return 'view'
// If no wsMember and board is workspace-visible: return null
```

### 4.2 Convex Dashboard Tests

**`[CONVEX]`** Full data layer smoke test (run in Convex dashboard function runner):

```
Test 1: Create workspace → create board → create column → create card
  Expected: Each insert succeeds. Board has correct workspaceId. Card has boardId denormalized.

Test 2: Move card to different column (same board)
  Expected: card.columnId updates. card.orderIndex updated. Activity log entry written.

Test 3: Attempt to move card to a column on a different board
  Expected: ConvexError thrown. No data written.

Test 4: Update card title
  Expected: cardHistory row written with previousValue = old title, newValue = new title.

Test 5: Delete card
  Expected: cardLabels, comments, cardHistory for that card all deleted.
  Query each table by cardId after deletion — should return empty/null.

Test 6: Delete column with 3 cards
  Expected: all 3 cards and their labels/comments/history deleted.
  Confirm via Convex dashboard: no orphaned records.

Test 7: Call updateCard with a user who has 'view' permission
  Expected: ConvexError with code 'FORBIDDEN'.

Test 8: Confirm activity log entry is written for each action
  Query activityLogs by boardId after each test above.
  Expected: CARD_CREATED, CARD_MOVED, CARD_UPDATED, CARD_DELETED,
            COLUMN_CREATED, COLUMN_DELETED entries are all present.
```

### 4.3 Claude-Side Verification

**`[CLAUDE]`** `requireUser` is the first call in every mutation:
- Read each mutation in `convex/cards.ts`, `convex/columns.ts`, `convex/boards.ts`
- For each mutation, confirm the first line is: `const user = await requireUser(ctx)`
- If any mutation reads or writes data before calling `requireUser`: unauthenticated actions could succeed

**`[CLAUDE]`** `moveCard` validates that the destination column belongs to the same board:
- Read `convex/cards.ts` `moveCard` mutation
- Confirm: `ctx.db.get(newColumnId)` is called and the result's `boardId` is compared to the card's `boardId`
- Confirm: if they don't match, a ConvexError is thrown before any write

**`[CLAUDE]`** Activity log has no `update` or `delete` mutations:
- Read `convex/activityLogs.ts`
- Confirm: there are no `ctx.db.patch()` or `ctx.db.delete()` calls targeting `activityLogs`
- The activity log is append-only — modifying it would destroy the audit trail

**`[CLAUDE]`** `createCard` denormalizes `boardId` onto the card:
- Read `convex/cards.ts` `createCard`
- Confirm: the inserted card document includes `boardId` (not just `columnId`)
- Without `boardId`, board-level queries require expensive joins

**`[CLAUDE]`** `deleteColumn` cascade delete order is correct:
- Read `convex/columns.ts` `deleteColumn`
- Confirm deletion order: cardLabels → comments → cardHistory → cards → column
- Deleting cards before their labels/comments/history leaves orphaned records

### 4.4 Security Tests

**`[SECURITY]`** `[CONVEX]` Unauthenticated mutation attempt:
1. In Convex dashboard, call any mutation without providing a valid identity
2. Expected: ConvexError with code `UNAUTHENTICATED`

**`[SECURITY]`** `[CONVEX]` Cross-board card move attempt:
1. Create two boards with one column each
2. Attempt to call `moveCard` with a column from the other board as `newColumnId`
3. Expected: ConvexError thrown — no data written

### 4.5 Acceptance Criteria

- [ ] `computeOrderIndex` handles all 4 edge cases correctly
- [ ] `getEffectiveBoardPermission` respects board override before workspace role
- [ ] All 8 Convex dashboard tests pass
- [ ] `requireUser` is first call in every mutation (Claude verified)
- [ ] `moveCard` validates destination column belongs to same board
- [ ] Activity log has no update/delete mutations
- [ ] Cascade deletes leave no orphan records

---

## Step 5: Board View — Static UI

### 5.1 Automated Tests

**`[AUTO]`** `AddCardInput` does not submit on empty title:

Create `__tests__/components/AddCardInput.test.tsx`:
```tsx
// Render AddCardInput
// Press Enter with empty input
// Expected: createCard mutation is NOT called
// Expected: no toast or error shown (silent rejection)
```

**`[AUTO]`** `DeleteColumnDialog` shows correct card count:
```tsx
// Render DeleteColumnDialog with a column that has 3 cards
// Expected: dialog body contains "3 cards" or "3 items"
// Expected: "Cancel" button closes the dialog
// Expected: "Delete" button calls the deleteColumn mutation
```

**`[AUTO]`** `ColumnHeader` submits on Enter and blurs:
```tsx
// Render ColumnHeader with title "To Do"
// Click the title to activate the input
// Type "Doing" and press Enter
// Expected: updateColumn mutation called with new title
// Type "X" and blur (click away)
// Expected: updateColumn mutation called with the new value
```

### 5.2 Manual Tests

**`[MANUAL]`** Board page loads and shows columns and cards from Convex:
1. Create a board in the workspace dashboard
2. Navigate to the board
3. Expected: empty board with no columns
4. Click "Add Column", type "To Do", press Enter
5. Expected: "To Do" column appears immediately (Convex reactive query updates)
6. Click "+ Add Card" inside "To Do", type "First task", press Enter
7. Expected: card appears in the column immediately

**`[MANUAL]`** Column rename:
1. Click the column title "To Do"
2. Expected: title becomes an editable input
3. Type "Backlog" and press Enter
4. Expected: column title updates to "Backlog" immediately
5. Verify in Convex dashboard: `columns` table shows updated title

**`[MANUAL]`** Delete column with cards — warning shown:
1. Add 2 cards to a column
2. Click the delete (trash) icon on the column header
3. Expected: AlertDialog appears with: "This column has 2 cards. Deleting it will also delete all cards inside."
4. Click "Cancel" — column and cards remain
5. Click the delete icon again, then click "Delete"
6. Expected: column and both cards disappear
7. Check Convex dashboard: no orphaned cards, labels, or comments from the deleted column

**`[MANUAL]`** Board settings page — visibility and permissions:
1. Navigate to board settings
2. Change visibility from "Workspace" to "Private"
3. Expected: change saves (check Convex dashboard)
4. Change a workspace member's board permission to "View"
5. Expected: change reflects in `boardMembers` table

### 5.3 Claude-Side Verification

**`[CLAUDE]`** `CardItem` renders only display-safe data (no raw HTML):
- Read `components/card/CardItem.tsx`
- Confirm: card title is rendered as `{card.title}` (text node), not via `dangerouslySetInnerHTML`
- Confirm: label chips display color class names (e.g., `bg-red-500`), not inline `style` from user input

**`[CLAUDE]`** `AddCardInput` input is trimmed before mutation call:
- Read `components/card/AddCardInput.tsx`
- Confirm: `title.trim()` is applied before calling `createCard`
- Confirm: empty-after-trim string is not submitted

**`[CLAUDE]`** `DeleteColumnDialog` fetches card count from server (not local state):
- Read `components/column/DeleteColumnDialog.tsx`
- Confirm: it calls `useQuery(api.columns.getWithCardCount, { columnId })`
- Using local `cards.length` would be wrong if the query is filtered or stale

### 5.4 Acceptance Criteria

- [ ] Board page loads with reactive column/card lists
- [ ] Add column, add card, rename column work correctly
- [ ] Delete column shows correct card count in warning dialog
- [ ] Cascade delete confirmed in Convex dashboard (no orphans)
- [ ] Board settings page saves visibility and member permissions
- [ ] Card titles rendered as text nodes — no `dangerouslySetInnerHTML` on card items

---

## Step 6: Card Modal

### 6.1 Automated Tests

**`[AUTO]`** `computeOrderIndex` edge cases (already in Step 4 tests — reuse)

**`[AUTO]`** `CardHistoryTab` formats actor name and field change correctly:
```tsx
// Render CardHistoryTab with a history entry:
//   { actor: { name: 'Alice' }, field: 'title', previousValue: 'Old', newValue: 'New' }
// Expected: renders "Alice changed title from 'Old' to 'New'"
```

**`[AUTO]`** `LabelPicker` calls `setCardLabels` only when labels have changed:
```tsx
// Render LabelPicker with labels: ['Bug']
// Close the popover without changing anything
// Expected: setCardLabels NOT called
// Open again, check 'Feature', close
// Expected: setCardLabels called with ['Bug', 'Feature']
```

**`[AUTO]`** Due date badge turns red when date is in the past:
```tsx
// Render CardItem with dueDate: "2020-01-01" (past date)
// Expected: due date badge has a red color class
// Render with dueDate: "2099-01-01" (future date)
// Expected: due date badge has a neutral color class
```

### 6.2 Manual Tests

**`[MANUAL]`** Open card modal and edit all fields:
1. Click a card to open the modal
2. In the Tiptap editor: type a description, apply Bold, add a bullet list
3. In AssigneePicker: select a workspace member as assignee
4. In LabelPicker: select "Bug" and "Urgent"
5. In due date picker: select a date 7 days from now
6. Click Save
7. Expected: modal shows updated content
8. Close and reopen the card
9. Expected: all saved fields are still present (persisted in Convex)

**`[MANUAL]`** Description is stored as JSON (not HTML):
1. Add a description to a card
2. Open Convex dashboard → `cards` table
3. Click the card record
4. Expected: `description` field is a JSON object (ProseMirror doc format), NOT an HTML string

**`[MANUAL]`** Card history tab records changes:
1. Open a card. The description is empty.
2. Add a description and save.
3. Change the description and save again.
4. Click the "History" tab in the modal.
5. Expected: two history entries showing the title or description changes
6. Expected: each entry shows the actor's name and a relative timestamp

**`[MANUAL]`** Delete card from modal:
1. Click "Delete Card" (red button at the bottom of the Details tab)
2. Expected: AlertDialog confirms "This cannot be undone"
3. Click "Delete"
4. Expected: modal closes. Card disappears from the board. Convex `cards` table no longer has the row.

**`[MANUAL]`** Assignee avatar appears on card in board view:
1. Assign a user to a card via the modal
2. Close the modal
3. Expected: the assignee's avatar chip is visible on the `CardItem` in the board view

### 6.3 Claude-Side Verification

**`[CLAUDE]`** Tiptap editor saves content as `editor.getJSON()` (not `editor.getHTML()`):
- Read `components/card/CardDetailsTab.tsx`
- Confirm: save button calls `updateCard({ description: editor.getJSON() })`
- If `editor.getHTML()` is used: raw HTML stored in database — XSS vector

**`[CLAUDE]`** Tiptap `editable` prop is controlled by user permission (stub — permission system not yet built, will verify in Step 15):
- Read `CardDetailsTab.tsx`
- Confirm: there is a prop or hook that will control the `editable` option
- The wiring will be verified in Step 15, but the prop interface must exist here

**`[CLAUDE]`** AssigneePicker does NOT allow arbitrary string user IDs:
- Read `components/card/AssigneePicker.tsx`
- Confirm: options come from `useQuery(api.workspaceMembers.list)`, not from free-text input
- Confirm: `updateCard` is called with a `userId: Id<'users'>` from the list

**`[CLAUDE]`** `CardModal` handles `null` card gracefully (card deleted while open):
- Read `components/card/CardModal.tsx`
- Confirm: if `useQuery(api.cards.get, { cardId })` returns `null`, the modal closes or shows a fallback — not a crash

### 6.4 Security Tests

**`[SECURITY]`** `[CLAUDE]` No `dangerouslySetInnerHTML` in card modal except for Tiptap display:
- Read all files in `components/card/`
- Confirm: `dangerouslySetInnerHTML` is used **only** where Tiptap's `generateHTML()` is called to render read-only content
- Any other use of `dangerouslySetInnerHTML` in card components is a potential XSS vector

### 6.5 Acceptance Criteria

- [ ] All card fields (description, assignee, labels, due date) save and persist
- [ ] Description stored as JSON object in Convex (verified in dashboard)
- [ ] History tab shows changes with actor names
- [ ] Delete card removes it from the board (no orphan records)
- [ ] `editor.getJSON()` (not `getHTML()`) confirmed in code
- [ ] `dangerouslySetInnerHTML` only used for Tiptap read-only output

---

## Step 7: Drag-and-Drop

### 7.1 Automated Tests

**`[AUTO]`** `computeOrderIndex` edge cases — full suite:

Create `__tests__/unit/lib/orderIndex.test.ts`:
```ts
// Standard: between prev=1000 and next=3000 → 2000
// Standard: between prev=1000 and next=2000 → 1500
// Insert at start: prev=undefined, next=1000 → 0 or negative (acceptable)
// Insert at end: prev=3000, next=undefined → 4000
// Tight gap (triggers reindex flag): prev=1000, next=1002 → midpoint + flag
// Same value inputs: prev=1000, next=1000 → throws or clamps (document the behavior)
// Fractional midpoint: prev=1, next=2 → 1.5
```

**`[AUTO]`** `onDragEnd` calls `computeOrderIndex` with correct prev/next siblings:
```ts
// Simulate drag of card at position [1000, 2000, 3000] to between index 0 and 1
// Expected: computeOrderIndex(undefined, 1000) called
// Expected: moveCard called with new orderIndex
```

### 7.2 Manual Tests

**`[MANUAL]`** Drag card between columns:
1. Create two columns: "To Do" and "In Progress"
2. Add 3 cards to "To Do"
3. Drag the first card to "In Progress"
4. Expected: card moves visually during drag (DragOverlay appears)
5. Expected: card is in "In Progress" after dropping
6. Refresh the page
7. Expected: card is still in "In Progress" (position persisted in Convex)

**`[MANUAL]`** Reorder cards within a column:
1. Have 3 cards in a column: Card A (top), Card B (middle), Card C (bottom)
2. Drag Card C to the top (above Card A)
3. Expected: order becomes C, A, B
4. Refresh the page
5. Expected: order is preserved as C, A, B

**`[MANUAL]`** Click on a card does NOT accidentally trigger drag:
1. Click on a card title (short click, no movement)
2. Expected: card modal opens — not a drag operation
3. This confirms `activationConstraint: { distance: 8 }` is working

**`[MANUAL]`** Drag handle is the only drag trigger:
1. Click and hold the card body (not the drag handle dots)
2. Move the mouse 10+ pixels
3. Expected: drag does NOT start (only the drag handle icon starts drag)

**`[MANUAL]`** Drag ghost (overlay) appears during drag:
1. Start dragging a card
2. Expected: a semi-transparent ghost card appears under the cursor
3. Expected: the original card position shows an empty placeholder

**`[MANUAL]`** Column drag and reorder:
1. Drag an entire column to a new position
2. Expected: column moves visually
3. Refresh the page
4. Expected: column order persists

### 7.3 Claude-Side Verification

**`[CLAUDE]`** `PointerSensor` has `activationConstraint: { distance: 8 }`:
- Read `components/board/BoardView.tsx`
- Confirm: `PointerSensor` is configured with `{ activationConstraint: { distance: 8 } }`
- Without this: every click that moves 1 pixel accidentally starts a drag

**`[CLAUDE]`** `DragOverlay` is used (not a copy of the card in the column):
- Read `BoardView.tsx`
- Confirm: `<DragOverlay>` wraps a `CardItem` component
- Without `DragOverlay`: the ghost rendering will be broken on scroll

**`[CLAUDE]`** `onDragEnd` calls both Convex mutation AND socket emit (Step 9 wiring — verify again in Step 9):
- Read `BoardView.tsx` `onDragEnd` handler
- Confirm: `moveCard(...)` mutation is called (persistence)
- Note: socket emit will be added in Step 9; in Step 7, only Convex mutation is present — that is correct for this step

**`[CLAUDE]`** Optimistic update is reverted on Convex error:
- Read `onDragEnd` handler
- Confirm: there is a `try/catch` or `.catch()` block
- Confirm: on error, local state is reset to the original position (not left in the wrong column)

### 7.4 Acceptance Criteria

- [ ] Drag card between columns — position persists after page refresh
- [ ] Reorder within column — order persists after page refresh
- [ ] Click does not trigger drag (distance constraint working)
- [ ] Drag overlay (ghost) appears during drag
- [ ] Column reorder persists
- [ ] `activationConstraint: { distance: 8 }` confirmed in code
- [ ] Optimistic update reversal on error confirmed in code

---

## Step 8: Socket.IO Server

### 8.1 Automated Tests

**`[AUTO]`** Auth middleware rejects connections without a token:

Create `server/__tests__/auth.test.ts`:
```ts
// Create a test Socket.IO server with the auth middleware
// Attempt to connect without socket.handshake.auth.token
// Expected: connection refused with error 'INVALID_TOKEN'
```

**`[AUTO]`** Auth middleware rejects connections with an expired token:
```ts
// Create an expired JWT (exp in the past)
// Attempt to connect with this token
// Expected: connection refused with error 'INVALID_TOKEN'
```

**`[AUTO]`** Rate limiter triggers at the configured threshold:

Create `server/__tests__/rateLimit.test.ts`:
```ts
// Send 30 events within 10 seconds from the same userId
// Expected: all 30 succeed
// Send the 31st event within the same window
// Expected: RATE_LIMITED event emitted to that socket
// Wait 10 seconds (window resets)
// Expected: next event succeeds
```

**`[AUTO]`** `addToPresence` and `removeFromPresence` are symmetric:
```ts
// addToPresence(boardId, userId, userData)
// Expected: getPresence(boardId) includes userId
// removeFromPresence(boardId, userId)
// Expected: getPresence(boardId) does NOT include userId
// Remove again (idempotent)
// Expected: no error thrown
```

### 8.2 Manual Tests

**`[MANUAL]`** Server starts cleanly:
1. `cd server && npm run dev`
2. Expected: console shows "Socket.IO server listening on port 3001"
3. Expected: "Redis adapter connected" log (if Redis is configured)
4. Expected: no errors in the terminal

**`[MANUAL]`** Connection without a token is refused:
1. Open a browser console on any page
2. Run:
   ```js
   const { io } = await import('socket.io-client')
   const s = io('http://localhost:3001', { auth: {} })
   s.on('connect_error', e => console.log('Error:', e.message))
   ```
3. Expected: console shows "Error: INVALID_TOKEN"
4. Expected: no `connect` event fires

**`[MANUAL]`** Connection with a valid token succeeds:
1. On `localhost:3000`, open the browser console
2. Get your Clerk JWT: `await window.Clerk?.session?.getToken()`
3. Copy the token
4. Run:
   ```js
   const s = io('http://localhost:3001', { auth: { token: '<paste_token_here>' } })
   s.on('connect', () => console.log('Connected!'))
   ```
5. Expected: "Connected!" appears in the console

**`[MANUAL]`** Health check — server responds to HTTP:
1. `curl http://localhost:3001/`
2. Expected: any HTTP response (even a 404) — confirms the HTTP server is running

### 8.3 Claude-Side Verification

**`[CLAUDE]`** CORS is set to an exact origin, never `"*"`:
- Read `server/src/index.ts`
- Confirm: `cors: { origin: process.env.ALLOWED_ORIGIN }` (a specific string, not `"*"`)
- `"*"` would allow any website to connect to the WebSocket server

**`[CLAUDE]`** `socket.data.userId` is set ONLY by the auth middleware, never from a client payload:
- Read `server/src/handlers/connection.ts`
- Confirm: no event handler reads `socket.data.userId = data.userId` or similar
- Confirm: all handlers reference `socket.data.userId` (set by middleware), not `data.userId` (from client)

**`[CLAUDE]`** All broadcast events use `socket.to(room)` (not `io.to(room)`):
- Read `server/src/handlers/connection.ts`
- Confirm: all broadcasts that should exclude the sender use `socket.to(roomId).emit(...)`
- `io.to(room)` includes the sender — they would see their own event duplicated

**`[CLAUDE]`** Rate limiter wraps every broadcast event handler:
- Read the connection handler
- Confirm: `CARD_CREATED`, `CARD_UPDATED`, `CARD_MOVED`, `CARD_DELETED`, `COLUMN_CREATED`, `COLUMN_UPDATED`, `COLUMN_DELETED`, `CHAT_MESSAGE_SENT` all call `checkRateLimit` before broadcasting

**`[CLAUDE]`** `server/.env` is in `.gitignore`:
- Confirm `server/.env` is listed in root `.gitignore` or `server/.gitignore`
- This file contains `CLERK_SECRET_KEY` — must not be committed

### 8.4 Security Tests

**`[SECURITY]`** `[MANUAL]` CORS rejects cross-origin connections:
1. Start the socket server
2. Open a browser console on a different port (e.g., `localhost:8080`)
3. Attempt to connect via Socket.IO
4. Expected: CORS error in the browser console — connection refused

**`[SECURITY]`** `[MANUAL]` Rate limiter actually blocks:
1. Connect to the server with a valid token
2. Emit 35 `CARD_MOVED` events within 5 seconds
3. Expected: on the 31st event, a `RATE_LIMITED` event is received

### 8.5 Acceptance Criteria

- [ ] Server starts without errors
- [ ] Connection without token is refused with `INVALID_TOKEN`
- [ ] Connection with valid Clerk JWT succeeds
- [ ] Rate limiter triggers at 30 events per 10-second window
- [ ] CORS set to exact origin, not `"*"` (Claude verified)
- [ ] `socket.data.userId` set only by middleware (Claude verified)
- [ ] All broadcasts use `socket.to()` not `io.to()` (Claude verified)
- [ ] Render deployment URL obtained and added to `.env.local` as `NEXT_PUBLIC_SOCKET_URL`

---

## Step 9: Real-Time Frontend Integration

### 9.1 Manual Tests (Two-Browser Required)

**`[E2E]`** Card move syncs in real time:
1. Open the same board in Browser A and Browser B (logged in as different users)
2. In Browser A: drag Card X from "To Do" to "In Progress"
3. Expected (Browser B): Card X moves from "To Do" to "In Progress" **without any page refresh**
4. Time from drop to B seeing the change: under 500ms

**`[E2E]`** Card creation syncs in real time:
1. In Browser A: click "+ Add Card", type "New Task", press Enter
2. Expected (Browser B): "New Task" card appears in the column within 500ms

**`[E2E]`** Column creation syncs in real time:
1. In Browser A: click "Add Column", type "Review", press Enter
2. Expected (Browser B): "Review" column appears immediately

**`[E2E]`** Card deletion syncs in real time:
1. In Browser A: open a card modal and click "Delete Card"
2. Expected (Browser B): the card disappears from the board immediately
3. If Browser B had the same card modal open: Expected: the modal closes and a toast appears ("This card was deleted by another user") — this is Step 17 but verify the basic deletion propagation now

**`[E2E]`** Column deletion syncs in real time:
1. In Browser A: delete a column
2. Expected (Browser B): the column and all its cards disappear immediately

**`[MANUAL]`** Offline banner appears on disconnect:
1. Start the board
2. Stop the Socket.IO server (`Ctrl+C`)
3. Expected (within 3–5 seconds): a yellow banner appears at the top: "You are offline. Reconnecting..."
4. Expected: drag-and-drop is disabled (cards cannot be dragged while offline)
5. Restart the server
6. Expected: banner disappears. Drag-and-drop re-enables.

**`[MANUAL]`** No double-render on Convex reactive update:
1. In Browser A: move a card
2. Expected (Browser A): the card moves once — not twice
3. The risk: if both the optimistic update AND the Convex reactive query update trigger a render, the card appears to flicker
4. If double-movement occurs: the optimistic update is conflicting with the Convex subscription — must be resolved

### 9.2 Claude-Side Verification

**`[CLAUDE]`** Socket emit fires AFTER the Convex mutation, never instead of it:
- Read `BoardView.tsx` `onDragEnd` and every card/column mutation call site
- Confirm: `await moveCard(...)` (or equivalent) comes BEFORE `socket.emit('CARD_MOVED', ...)`
- Confirm: there is no code path that emits a socket event without first calling the Convex mutation

**`[CLAUDE]`** `useBoardRoom` registers all 8 board events:
- Read `hooks/useBoardRoom.ts`
- Confirm listeners for: `CARD_CREATED`, `CARD_UPDATED`, `CARD_MOVED`, `CARD_DELETED`, `COLUMN_CREATED`, `COLUMN_UPDATED`, `COLUMN_DELETED`, `RATE_LIMITED`

**`[CLAUDE]`** `useBoardRoom` emits `LEAVE_BOARD` on unmount:
- Read `hooks/useBoardRoom.ts`
- Confirm: the `useEffect` cleanup function (the function returned by the effect) emits `LEAVE_BOARD` and removes all event listeners
- Not cleaning up leaves ghost listeners and never updates the presence bar

**`[CLAUDE]`** `SocketProvider` disconnects socket when Clerk session ends:
- Read `components/providers/SocketProvider.tsx`
- Confirm: there is a listener or effect that calls `socket.disconnect()` when the Clerk auth state shows the user has signed out

### 9.3 Acceptance Criteria

- [ ] Card move syncs across two browsers in under 500ms
- [ ] Card create syncs across two browsers
- [ ] Column create syncs across two browsers
- [ ] Card delete syncs across two browsers
- [ ] Offline banner appears when Socket.IO server is stopped
- [ ] Drag-and-drop is disabled while offline
- [ ] Socket emit fires after Convex mutation (not instead of it — Claude verified)
- [ ] All 8 board events registered in `useBoardRoom` (Claude verified)
- [ ] `LEAVE_BOARD` emitted on component unmount (Claude verified)

---

## Step 10: Presence

### 10.1 Manual Tests (Two-Browser Required)

**`[E2E]`** Avatar appears when user joins:
1. Open the board in Browser A
2. Open the same board in Browser B
3. Expected (Browser A): Browser B's user avatar appears in the presence bar within 1 second
4. Expected (Browser B): Browser A's user avatar is also visible

**`[E2E]`** Avatar disappears when user leaves:
1. Both users are on the same board (both avatars visible in each browser)
2. Close Browser B's tab (or navigate away)
3. Expected (Browser A): Browser B's avatar disappears within 2–3 seconds
4. The disconnect event from Socket.IO triggers the removal

**`[E2E]`** Current user's own avatar is present in the bar:
1. Open a board
2. Expected: your own avatar appears in the presence bar
3. (Both your avatar and any other online users' avatars are shown)

**`[E2E]`** Overflow badge when more than 5 users online:
1. Open the board in 6+ browser sessions (or mock: add 6 entries to the presence state)
2. Expected: 5 avatars shown + "+N" badge for the remainder

**`[MANUAL]`** Avatar tooltip shows user's name:
1. Hover over an avatar in the presence bar
2. Expected: shadcn Tooltip appears with the user's display name

### 10.2 Claude-Side Verification

**`[CLAUDE]`** `usePresence` uses `PRESENCE_INIT` (not polling) for the initial state:
- Read `hooks/usePresence.ts`
- Confirm: initial presence state comes from a `socket.on('PRESENCE_INIT', ...)` listener
- Not from an HTTP request or a `setInterval`

**`[CLAUDE]`** `PRESENCE_INIT` is emitted only to the joining socket, not the whole room:
- Read `server/src/handlers/connection.ts`
- Confirm: `PRESENCE_INIT` uses `socket.emit(...)` (to the joiner only), not `socket.to(room).emit(...)` (to the whole room)
- The joiner needs the initial list; existing members just need a delta update via `PRESENCE_UPDATE`

**`[CLAUDE]`** Presence store is board-scoped:
- Read `server/src/presence.ts`
- Confirm: the store is keyed by `boardId`: `Map<boardId, Map<userId, userData>>`
- Not workspace-scoped or global: users on different boards must not see each other's presence

### 10.3 Acceptance Criteria

- [ ] Avatar appears within 1 second of joining
- [ ] Avatar disappears within 3 seconds of leaving
- [ ] Both users see each other's avatars
- [ ] Overflow "+N" badge shown beyond 5 users
- [ ] Tooltip shows display name on hover
- [ ] `PRESENCE_INIT` emitted only to joining socket (Claude verified)
- [ ] Presence store is board-scoped (Claude verified)

---

## Step 11: Comments & @Mentions

### 11.1 Automated Tests

**`[AUTO]`** `extractMentionedUserIds` returns correct IDs from Tiptap JSON:

Create `__tests__/unit/lib/mentions.test.ts`:
```ts
const doc = {
  type: 'doc',
  content: [{
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Hey ' },
      { type: 'mention', attrs: { id: 'user_123', label: 'Alice' } },
      { type: 'text', text: ' can you check this?' },
    ]
  }]
}
// extractMentionedUserIds(doc) → ['user_123']

// Multiple mentions
// extractMentionedUserIds(docWith3Mentions) → ['user_1', 'user_2', 'user_3']

// No mentions
// extractMentionedUserIds(plainTextDoc) → []

// Duplicate mention of same user
// extractMentionedUserIds(docWithDuplicate) → ['user_123'] (deduplicated)
```

**`[AUTO]`** `createNotification` is NOT called for the comment author's own @mention:
```ts
// Author is user_123
// Comment mentions user_123 and user_456
// Expected: notification created for user_456 only
// Expected: no notification created for user_123 (you cannot notify yourself)
```

**`[AUTO]`** @mention suggestion dropdown filters correctly:
```tsx
// Render CommentInput with workspace members: ['Alice', 'Bob', 'Charlie']
// Type "@Al"
// Expected: dropdown shows only "Alice"
// Type "@" (empty query)
// Expected: all workspace members shown (up to limit)
```

### 11.2 Manual Tests

**`[E2E]`** Comment appears in real time (two browsers):
1. Open a card modal in both Browser A and Browser B
2. In Browser A: type a comment and submit
3. Expected (Browser B): the comment appears in Browser B's card modal **without refresh**

**`[E2E]`** @mention creates a notification:
1. User A opens a card and posts a comment: "@UserB please review this"
2. Expected (Browser B as UserB): a notification badge appears on the bell icon
3. Click the bell: see "User A mentioned you in '[card name]'"

**`[MANUAL]`** @mention dropdown appears while typing:
1. Open a card modal → click in the comment input
2. Type "@" followed by the first letter of a workspace member's name
3. Expected: a Tippy.js dropdown appears listing matching members
4. Press Arrow Down to navigate, Enter to select
5. Expected: a mention chip appears in the editor

**`[MANUAL]`** Non-member @mention produces plain text:
1. In the comment editor, type "@nonexistentuser"
2. Expected: no dropdown appears (or dropdown shows no results)
3. Submit the comment
4. Expected: the text "@nonexistentuser" appears as plain text
5. Expected: no notification is created

**`[MANUAL]`** Edit own comment:
1. Post a comment
2. Click the "Edit" button on your comment
3. Expected: comment body becomes an editable Tiptap editor
4. Change the text, click Save
5. Expected: comment updates. An "edited" indicator is shown (e.g., "(edited)")

**`[MANUAL]`** Delete own comment with confirmation:
1. Click "Delete" on your comment
2. Expected: a confirmation prompt appears
3. Confirm deletion
4. Expected: comment disappears

**`[MANUAL]`** Edit/delete buttons are hidden on other users' comments:
1. View a comment posted by User A while logged in as User B
2. Expected: no Edit or Delete buttons visible

### 11.3 Claude-Side Verification

**`[CLAUDE]`** Comment body stored as Tiptap JSON, not HTML:
- Read `convex/comments.ts` `createComment` mutation
- Confirm: body is inserted as-is from the client (which is `editor.getJSON()`)
- Confirm: there is no `.innerHTML` conversion before storing

**`[CLAUDE]`** `extractMentionedUserIds` validates mention IDs against workspace membership:
- Read `convex/lib/mentions.ts` or the section of `createComment` that processes mentions
- Confirm: for each mention ID, the code queries `workspaceMembers` to verify the user is actually in the workspace
- A client could craft a comment with any user ID in the mention node — the server must validate

**`[CLAUDE]`** Notification is not created when the mentioned user is the comment author:
- Read `createComment` mutation's notification-creation logic
- Confirm: `if (mentionedUserId !== comment.authorId)` guard exists before creating the notification

### 11.4 Security Tests

**`[SECURITY]`** `[CONVEX]` Crafted comment cannot mention a non-workspace user:
1. Manually craft a Convex mutation call with a comment body JSON containing a mention node with a userId from a different workspace
2. Expected: `createNotification` is NOT called for that user

### 11.5 Acceptance Criteria

- [ ] Comments appear in real time across two browsers
- [ ] @mention creates a notification for the mentioned user
- [ ] @mention dropdown filters workspace members correctly
- [ ] @mention of non-member produces plain text, no notification
- [ ] Edit/delete buttons only visible to comment author
- [ ] `extractMentionedUserIds` deduplicates and filters correctly
- [ ] Author cannot receive notification for their own @mention
- [ ] Mention IDs validated against workspace membership (Claude verified)

---

## Step 12: Notifications

### 12.1 Automated Tests

**`[AUTO]`** `getUnreadCount` returns 0 when all notifications are read:
```ts
// All notifications have isRead: true
// Expected: getUnreadCount returns 0
```

**`[AUTO]`** `markAllAsRead` sets all notifications to `isRead: true`:
```ts
// Create 3 unread notifications for a user
// Call markAllAsRead
// Expected: all 3 now have isRead: true
// Expected: getUnreadCount returns 0
```

**`[AUTO]`** `NotificationBell` shows no badge when count is 0:
```tsx
// Render NotificationBell with unread count = 0
// Expected: badge element is hidden (not rendered or has 'hidden' class)
// Render with unread count = 3
// Expected: badge shows "3"
// Render with unread count = 99
// Expected: badge shows "99" (or "99+" if capped)
```

### 12.2 Manual Tests

**`[E2E]`** Notification appears in real time when assigned:
1. User A opens a card and assigns it to User B
2. Expected (Browser B): notification bell badge increments immediately (reactive via Convex)
3. Expected: clicking the bell shows "User A assigned you to '[card title]'"

**`[E2E]`** Notification navigates to the correct card:
1. User B clicks a notification item
2. Expected: the notification is marked as read (no longer highlighted)
3. Expected: the app navigates to the correct board
4. Expected: the card modal opens for the referenced card

**`[MANUAL]`** "Mark all as read" clears the badge:
1. Accumulate 3 unread notifications
2. Click the bell to open the popover
3. Click "Mark all as read"
4. Expected: all notification items lose their highlight
5. Expected: the badge on the bell icon disappears

**`[MANUAL]`** Empty state renders correctly:
1. Log in as a new user with no notifications
2. Click the notification bell
3. Expected: "No notifications yet" message shown

### 12.3 Claude-Side Verification

**`[CLAUDE]`** `getUnreadCount` query is reactive (uses `useQuery`, not a one-time fetch):
- Read `components/notifications/NotificationBell.tsx`
- Confirm: `useQuery(api.notifications.getUnreadCount)` is called — not `useMutation` or `fetch`
- Reactive queries auto-update when the underlying data changes

**`[CLAUDE]`** Notification is only created for workspace members:
- Read `convex/lib/notifications.ts` `createNotification` helper
- Confirm: there is a check that the target `userId` is a member of the relevant workspace

**`[CLAUDE]`** Notification navigation constructs the correct URL:
- Read `components/notifications/NotificationItem.tsx`
- Confirm: click handler uses both `workspaceSlug` and `boardId` to construct the navigation path
- Confirm: `openCardId` is set to open the specific card modal

### 12.4 Acceptance Criteria

- [ ] Notification badge increments in real time on assignment
- [ ] Notification badge increments in real time on @mention
- [ ] Clicking notification navigates to the correct board and opens the card
- [ ] Mark all as read clears the badge
- [ ] `getUnreadCount` is reactive (not a one-time fetch — Claude verified)
- [ ] Notifications only created for workspace members (Claude verified)

---

## Step 13: Board Chat & Typing Indicators

### 13.1 Automated Tests

**`[AUTO]`** `useTypingIndicator` formats output correctly:

Create `__tests__/unit/hooks/useTypingIndicator.test.ts`:
```ts
// typingUsers = [] → returns ""
// typingUsers = ['Alice'] → returns "Alice is typing..."
// typingUsers = ['Alice', 'Bob'] → returns "Alice and Bob are typing..."
// typingUsers = ['Alice', 'Bob', 'Charlie'] → returns "Alice, Bob, and Charlie are typing..." or "3 people are typing..."
```

**`[AUTO]`** `useTypingIndicator` auto-removes user after 3 seconds:
```ts
// Add 'Alice' to typing set at t=0
// At t=2.9s: Alice still in set
// At t=3.1s: Alice removed from set
// Confirm no TYPING_STOP event needed for removal (safety timeout)
```

**`[AUTO]`** Chat input does not submit empty messages:
```tsx
// Render ChatInput
// Press Enter with empty input
// Expected: sendChatMessage NOT called
// Type "  " (spaces only), press Enter
// Expected: sendChatMessage NOT called (trim check)
```

### 13.2 Manual Tests

**`[E2E]`** Chat messages appear in real time:
1. Both users have the same board open with chat panel visible
2. User A types "Hello!" and presses Enter
3. Expected (Browser B): "Hello!" appears in the chat within 500ms

**`[E2E]`** Typing indicator appears:
1. User A starts typing in the chat input
2. Expected (Browser B): "User A is typing..." appears below the chat
3. User A stops typing for 3 seconds
4. Expected (Browser B): "User A is typing..." disappears

**`[E2E]`** User A does NOT see their own typing indicator:
1. User A types in the chat input
2. Expected (Browser A): no "User A is typing..." text appears for User A
3. Expected (Browser B): "User A is typing..." appears

**`[MANUAL]`** Chat panel toggle:
1. Click the chat toggle button in the board header
2. Expected: chat panel slides in from the right
3. Click again
4. Expected: chat panel slides out

**`[MANUAL]`** Chat history loads on open:
1. Send 5 messages over multiple sessions
2. Re-open the board
3. Expected: the last 100 messages are loaded immediately (from Convex reactive query)

**`[MANUAL]`** Chat input is plain text (no Tiptap formatting):
1. Type chat message containing `**bold**` syntax
2. Expected: submitted as literal text `**bold**`, not rendered as bold
3. Confirm: chat body is stored as `v.string()` in Convex, not JSON

### 13.3 Claude-Side Verification

**`[CLAUDE]`** Chat uses plain text (not Tiptap JSON):
- Read `components/chat/ChatInput.tsx`
- Confirm: input is a plain `<input>` or `<textarea>`, not a Tiptap instance
- Confirm: `sendChatMessage` Convex mutation receives a `string`, not a JSON object

**`[CLAUDE]`** Typing stop debounce timeout uses `useRef`, not `useState`:
- Read `components/chat/ChatInput.tsx`
- Confirm: the debounce timeout ID is stored in a `useRef`, not a `useState`
- Using `useState` for the timeout would cause re-renders on every keypress

**`[CLAUDE]`** `TYPING_START` / `TYPING_STOP` events are rate-limited by the server:
- Read `server/src/handlers/connection.ts`
- Confirm: `TYPING_START` and `TYPING_STOP` handlers call `checkRateLimit` before broadcasting

### 13.4 Acceptance Criteria

- [ ] Chat messages appear in real time across two browsers
- [ ] Typing indicator appears for the other user, not for the typer
- [ ] Typing indicator auto-clears after 3 seconds without input
- [ ] Chat input cannot submit empty or whitespace-only messages
- [ ] Chat body stored as plain text string (not Tiptap JSON — Claude verified)
- [ ] Debounce timeout in `useRef` (Claude verified)

---

## Step 14: Activity Log

### 14.1 Automated Tests

**`[AUTO]`** `formatActivityEntry` returns correct string for every action type:

Create `__tests__/unit/lib/formatActivityEntry.test.ts`:
```ts
// CARD_CREATED: { cardTitle: 'Fix login' } → "created card 'Fix login'"
// CARD_MOVED: { cardTitle: 'Fix login', fromColumn: 'To Do', toColumn: 'In Progress' }
//   → "moved 'Fix login' from To Do to In Progress"
// CARD_UPDATED title: { field: 'title', previousValue: 'Old', newValue: 'New' }
//   → "renamed card from 'Old' to 'New'"
// CARD_UPDATED description: { field: 'description' }
//   → "updated description of '[card title]'"
// CARD_DELETED: { cardTitle: 'Fix login' } → "deleted card 'Fix login'"
// COLUMN_CREATED: { columnTitle: 'Review' } → "created column 'Review'"
// COLUMN_DELETED: { columnTitle: 'Review', cardCount: 3 }
//   → "deleted column 'Review' with 3 cards"
// COMMENT_ADDED: { cardTitle: 'Fix login' } → "commented on 'Fix login'"
// Unknown action type → "performed an action" (fallback — no crash)
```

**`[AUTO]`** Activity log query does not call `ctx.db.patch` or `ctx.db.delete`:
- This is a Claude verification (see below), but also enforce via test:
```ts
// Mock ctx.db.patch and ctx.db.delete
// Call listByBoard
// Expected: neither mock is ever called
```

### 14.2 Manual Tests

**`[MANUAL]`** Activity log panel opens:
1. Click the "Activity" button in the board header
2. Expected: panel slides in from the right
3. Expected: most recent actions are shown at the top

**`[MANUAL]`** Every board action appears in the log:
Perform each of these actions and verify a corresponding entry appears:
- [ ] Create a card → "created card '[title]'"
- [ ] Move a card to another column → "moved '[title]' from '[col]' to '[col]'"
- [ ] Update a card title → "renamed card from '...' to '...'"
- [ ] Delete a card → "deleted card '[title]'"
- [ ] Create a column → "created column '[title]'"
- [ ] Rename a column → "renamed column from '...' to '...'"
- [ ] Delete a column → "deleted column '[title]' with N cards"
- [ ] Post a comment → "commented on '[card title]'"

**`[MANUAL]`** Activity log filter by action type:
1. Open the activity log panel
2. Use the "Action Type" dropdown to select "Card Moved"
3. Expected: only CARD_MOVED entries are shown

**`[MANUAL]`** Activity log filter by user:
1. Open the activity log panel
2. Use the "User" dropdown to select a specific team member
3. Expected: only entries where that user is the actor are shown

**`[MANUAL]`** Activity log pagination:
1. Perform 25+ board actions to fill the log
2. Open the activity log panel
3. Expected: first 20 entries are shown
4. Click "Load more"
5. Expected: next 20 entries are appended below

**`[MANUAL]`** Clicking an activity log entry opens the card:
1. Find an entry that references a card (e.g., "moved 'Fix login' from To Do to In Progress")
2. Click on the entry
3. Expected: the card modal opens for "Fix login"

### 14.3 Claude-Side Verification

**`[CLAUDE]`** Every card/column/comment mutation calls `writeActivityLog`:
- Read `convex/cards.ts`, `convex/columns.ts`, `convex/comments.ts`
- For each mutation: `createCard`, `updateCard`, `moveCard`, `deleteCard`, `createColumn`, `updateColumn`, `deleteColumn`, `createComment`
- Confirm: every mutation body contains a `writeActivityLog(ctx, ...)` call
- Missing calls create silent gaps in the audit trail

**`[CLAUDE]`** `activityLogs` table has no `update` or `delete` mutations:
- Read `convex/activityLogs.ts`
- Confirm: no `ctx.db.patch(activityLogId, ...)` or `ctx.db.delete(activityLogId)` calls exist anywhere in the codebase
- Grep for `activityLogs` in all Convex files and confirm only `ctx.db.insert` and `ctx.db.query` calls exist

**`[CLAUDE]`** Activity log query is paginated using Convex `.paginate()`:
- Read `convex/activityLogs.ts` `listByBoard` query
- Confirm: `.paginate({ numItems: 20, cursor })` is used (not `.collect()`)
- Using `.collect()` loads all entries at once — a performance issue for large boards

### 14.4 Acceptance Criteria

- [ ] All 8 board action types produce the correct formatted log entry string
- [ ] Activity log panel shows all actions performed in correct order
- [ ] Filters by action type and user work correctly
- [ ] Pagination loads 20 entries at a time with "Load more"
- [ ] Clicking an entry opens the referenced card
- [ ] All 8 mutations call `writeActivityLog` (Claude verified)
- [ ] No `update` or `delete` on `activityLogs` table anywhere (Claude verified)
- [ ] Activity log uses `.paginate()` not `.collect()` (Claude verified)

---

## Step 15: Permission Enforcement

### 15.1 Automated Tests

**`[AUTO]`** `canEdit` and `canComment` return correct values:

Create `__tests__/unit/lib/permissions.test.ts`:
```ts
// canEdit('edit') → true
// canEdit('comment') → false
// canEdit('view') → false
// canEdit(null) → false

// canComment('edit') → true
// canComment('comment') → true
// canComment('view') → false
// canComment(null) → false
```

**`[AUTO]`** Drag handle is not rendered when permission is not 'edit':
```tsx
// Render CardItem with permission='view'
// Expected: drag handle icon is not in the DOM
// Render CardItem with permission='edit'
// Expected: drag handle icon is present
```

**`[AUTO]`** Card modal Save button is hidden when permission is not 'edit':
```tsx
// Render CardDetailsTab with permission='view'
// Expected: Save button not present (or has 'disabled' + 'hidden' attributes)
// Render CardDetailsTab with permission='comment'
// Expected: Save button not present
// Render CardDetailsTab with permission='edit'
// Expected: Save button present
```

### 15.2 Manual Tests

**`[E2E]`** View-only user cannot drag cards:
1. Set User B's board permission to "View" in board settings
2. User B opens the board
3. User B attempts to drag a card (clicks and holds, moves mouse)
4. Expected (UI): drag handle is not visible on card items
5. Expected (behavior): drag does not initiate even if user clicks on a card

**`[E2E]`** View-only user cannot add cards:
1. User B (view-only) opens the board
2. Expected: no "+ Add Card" input is visible at the bottom of any column
3. Expected: no "+ Add Column" button is visible

**`[E2E]`** Comment-only user can post comments but not edit cards:
1. Set User B's board permission to "Comment"
2. User B opens a card modal
3. Expected: the description editor is in read-only mode (cannot type in it)
4. Expected: the comment input is available (User B can type and submit)
5. Expected: assignee picker, label picker, due date picker are all disabled/hidden

**`[SECURITY]`** `[E2E]` Server rejects unauthorized mutation — even if client sends it:
1. User B has "View" permission on the board
2. In Browser B's console: manually call the mutation:
   ```js
   await window.__convex__.mutation(api.cards.moveCard, {
     cardId: '<some_id>',
     newColumnId: '<some_id>',
     newOrderIndex: 1500
   })
   ```
3. Expected: ConvexError with code `FORBIDDEN` is returned
4. Expected: no card moved in the database
5. This test confirms the server enforces permissions regardless of the UI

**`[E2E]`** Optimistic update is reverted on FORBIDDEN:
1. User B has "View" permission
2. Somehow trigger a mutation call that causes a FORBIDDEN response (simulate in test or bypass UI)
3. Expected: any optimistic visual update is immediately reverted
4. Expected: a toast appears: "You don't have permission to do that."

**`[E2E]`** Permission change takes effect without page refresh:
1. User B is on the board with "Edit" permission — can drag cards
2. User A (admin) changes User B's permission to "View" in board settings
3. Expected (Browser B): Convex reactive query updates `useBoardPermission`
4. Expected (Browser B): drag handles disappear, edit controls hide — without refresh

### 15.3 Claude-Side Verification

**`[CLAUDE]`** `assertBoardPermission` is called before every write operation in Convex:
- Read every mutation in `convex/cards.ts`, `convex/columns.ts`, `convex/comments.ts`
- Confirm: `assertBoardPermission(ctx, boardId, user._id, 'edit')` (or `'comment'`) is called before any `ctx.db.insert/patch/delete`

**`[CLAUDE]`** `useBoardPermission` uses a reactive `useQuery` (not a one-time fetch):
- Read `hooks/useBoardPermission.ts` (or wherever the permission is derived)
- Confirm: `useQuery(api.boards.getMembers, { boardId })` provides the permission
- Reactive: when the admin changes a member's permission, the member's UI updates in real time

**`[CLAUDE]`** Client-side permission checks use the same logic as server-side:
- Read `lib/permissions.ts` (client-side helpers)
- Confirm: `canEdit` and `canComment` functions match the server-side `permRank` mapping
- A mismatch would show users controls they cannot use, leading to FORBIDDEN errors on mutation

### 15.4 Acceptance Criteria

- [ ] View-only user sees no drag handles, no Add Card, no Add Column
- [ ] View-only user's card modal fields are all read-only
- [ ] Comment-only user can post comments but cannot edit card fields
- [ ] Server rejects `moveCard` from a view-only user even when called from the console
- [ ] Toast appears on FORBIDDEN with optimistic revert
- [ ] Permission change takes effect without page refresh (reactive)
- [ ] `assertBoardPermission` present in every write mutation (Claude verified)

---

## Step 16: Dark Mode & Mobile Responsiveness

### 16.1 Automated Tests

**`[AUTO]`** Dark mode toggle calls `setTheme`:
```tsx
// Render the dark mode toggle button (moon/sun icon)
// Click the button
// Expected: `setTheme` from `useTheme()` is called with 'dark' or 'light'
```

**`[AUTO]`** Mobile sidebar opens and closes:
```tsx
// Render the mobile layout (set viewport to 375px width)
// Click hamburger menu button
// Expected: Sheet component opens (aria-hidden changes from true to false)
// Click outside the sheet or the close button
// Expected: Sheet closes
```

### 16.2 Manual Tests

**`[MANUAL]`** Dark mode toggle switches theme:
1. Click the moon/sun icon toggle in the sidebar or board header
2. Expected: entire app switches to dark theme immediately
3. Expected: all shadcn components render correctly (no white text on white background, no invisible borders)
4. Check these specific components in dark mode:
   - [ ] Sidebar background and text
   - [ ] Board columns and cards
   - [ ] Card modal (dialog)
   - [ ] Notification popover
   - [ ] Chat panel
   - [ ] Activity log panel
   - [ ] Toasts / alerts
5. Refresh the page
6. Expected: dark mode is still active (preference saved by next-themes in localStorage)
7. Toggle back to light mode — verify it returns cleanly

**`[MANUAL]`** Mobile layout at 375px:
1. Open DevTools → set viewport to 375px wide (iPhone SE)
2. Expected: horizontal Kanban scroll is replaced by column tabs
3. Tap a column tab — expected: that column fills the screen
4. Add a card on mobile — expected: Add Card input is accessible
5. Open a card modal on mobile — expected: modal is full-screen bottom sheet (not a tiny centered dialog)
6. Tap the hamburger menu — expected: sidebar slides in from the left
7. Tap a workspace link in the sidebar — expected: sidebar closes and navigation occurs

**`[MANUAL]`** Mobile chat panel:
1. On 375px viewport, look for the chat toggle
2. Expected: it is a floating action button (bottom-right), not the desktop side panel
3. Tap the FAB — expected: chat opens as a Sheet from the bottom

**`[MANUAL]`** Tablet breakpoint (768px):
1. Set viewport to 768px
2. Expected: the layout switches from mobile to desktop (sidebar visible, horizontal kanban)

### 16.3 Claude-Side Verification

**`[CLAUDE]`** `ThemeProvider` uses `attribute="class"` (not `data-theme`):
- Read `components/providers/ThemeProvider.tsx`
- Confirm: `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
- If `attribute="data-theme"`: Tailwind's `darkMode: 'class'` will not trigger (it looks for class on `<html>`)

**`[CLAUDE]`** Dark mode Tailwind config is set to `'class'` strategy:
- Read `tailwind.config.ts`
- Confirm: `darkMode: 'class'`
- If missing or `'media'`: the toggle will not work — it will only follow OS preference

**`[CLAUDE]`** Mobile column tab navigation uses CSS media query, not JavaScript viewport detection:
- Read `components/board/BoardView.tsx`
- Confirm: mobile/desktop layout split uses `hidden md:flex` / `flex md:hidden` Tailwind classes
- Not `window.innerWidth` or `useWindowSize()` — CSS-based is more reliable with SSR

### 16.4 Acceptance Criteria

- [ ] Dark mode toggle works and persists across page refreshes
- [ ] All major UI components render correctly in dark mode (no invisible elements)
- [ ] Mobile layout (375px) shows column tabs instead of horizontal scroll
- [ ] Mobile card modal is full-screen bottom sheet
- [ ] Mobile sidebar opens as a Sheet overlay
- [ ] `ThemeProvider` uses `attribute="class"` (Claude verified)
- [ ] `tailwind.config.ts` has `darkMode: 'class'` (Claude verified)

---

## Step 17: Edge Cases & Error Handling

For each edge case, the test maps to the corresponding PRD section 9 item.

### 17.1 Concurrent Edit (PRD 9.1)

**`[E2E]`** Active Tiptap editor is not overwritten during concurrent edit:
1. User A opens a card modal. The editor is in edit mode.
2. User B edits and saves the same card title.
3. Expected (User A): the modal header shows the updated title with a "Updated by User B" notice
4. Expected (User A): the Tiptap editor content is NOT overwritten while User A is actively editing
5. User A saves their description edit
6. Expected: User A's save goes through (last write wins — documented behavior)

### 17.2 Deleted Card Modal Auto-Close (PRD 9.10)

**`[E2E]`** Modal closes and toast shows when open card is deleted:
1. User A opens Card X's modal (full-screen or dialog)
2. User B deletes Card X
3. Expected (User A): within 1 second, the modal closes
4. Expected (User A): a toast appears: "This card was deleted by another user."
5. Expected (User A): returns to the normal board view (card is gone from the column)

**`[MANUAL]`** Secondary fallback — Convex null card closes modal:
1. Manually delete a card via the Convex dashboard
2. Expected: the card modal closes automatically if it was open
3. This tests the `useQuery(api.cards.get)` returning `null` fallback in `CardModal.tsx`

### 17.3 WebSocket Reconnection (PRD 9.3)

**`[E2E]`** Reconnection re-registers board room and restores presence:
1. User A is on a board (presence avatar visible to User B)
2. User A's network is interrupted (simulate: DevTools → Network → Offline)
3. Expected (User A): offline banner appears
4. Expected (User B): User A's avatar disappears from the presence bar
5. Restore network: DevTools → Network → Online
6. Expected (User A): banner disappears
7. Expected (User B): User A's avatar reappears (re-JOIN_BOARD on reconnect)
8. Expected (User A): missed events are handled (Convex queries auto-recover)

### 17.4 @Mention of Non-Member (PRD 9.8)

**`[MANUAL]`** @Mention suggestion only shows workspace members:
1. In the comment editor, type "@"
2. Type a name that is NOT a workspace member
3. Expected: no dropdown suggestion appears for that name
4. Submit the comment with the text typed as-is
5. Expected: text is stored as plain text — no mention node in the Tiptap JSON
6. Expected: no notification is created

### 17.5 Removed Member Display (PRD 9.9)

**`[E2E]`** Removed assignee shows fallback text:
1. User B is assigned to Card X
2. User B is removed from the workspace
3. Expected (Card X): assignee field shows "[Removed Member]" with a generic avatar
4. Expected: `AssigneePicker` dropdown does not include User B

### 17.6 Invalid Invite Link (PRD 9.6)

**`[MANUAL]`** Expired link shows error page:
- (Covered in Step 3 tests — re-verify here if any changes were made since then)
1. Click an expired invite link
2. Expected: error page: "This invite link is no longer valid. Ask the workspace owner for a new one."

### 17.7 Duplicate Workspace Slug (PRD 9.5)

**`[MANUAL]`** Duplicate slug auto-appends suffix:
- (Covered in Step 3 tests — re-verify)
1. Create workspace "My Team" → slug: `my-team`
2. As another user, create workspace "My Team" → slug: `my-team-2`
3. Both workspaces accessible at their respective URLs

### 17.8 Column Deletion Warning (PRD 9.4)

**`[MANUAL]`** Deletion warning shows correct card count:
- (Covered in Step 5 tests — re-verify)
1. Add exactly 5 cards to a column
2. Click delete on the column
3. Expected: warning shows "5 cards" (not a different number)

### 17.9 Unauthorized Action (PRD 9.7)

**`[SECURITY]`** `[E2E]` View-only user's card move is rejected server-side:
- (Covered in Step 15 tests — re-verify the server rejection, not just the UI hiding)
1. View-only user calls `moveCard` directly from the console
2. Expected: FORBIDDEN error returned
3. Expected: no data written

### 17.10 Claude-Side Verification

**`[CLAUDE]`** All 10 PRD edge cases have explicit handlers in the code:
Check each case has corresponding code:
- [ ] PRD 9.1 (concurrent edit): Tiptap editor not overwritten by reactive update while in edit mode
- [ ] PRD 9.2 (concurrent ordering): `reindexColumnCards` called when gap < 10
- [ ] PRD 9.3 (WebSocket disconnect): reconnect re-emits `JOIN_BOARD`
- [ ] PRD 9.4 (column delete with cards): `DeleteColumnDialog` warns with card count
- [ ] PRD 9.5 (duplicate slug): `createWorkspace` appends numeric suffix
- [ ] PRD 9.6 (invalid invite): `acceptInvite` throws `INVITE_EXPIRED`, page shows error
- [ ] PRD 9.7 (unauthorized action): `assertBoardPermission` in every mutation
- [ ] PRD 9.8 (@mention non-member): `extractMentionedUserIds` validates against workspace
- [ ] PRD 9.9 (removed member): card assignee field shows "[Removed Member]" fallback
- [ ] PRD 9.10 (deleted card modal): `useBoardRoom` `CARD_DELETED` handler checks `openCardId`

### 17.11 Acceptance Criteria

- [ ] Active editor content protected from concurrent overwrites
- [ ] Card modal auto-closes when card is deleted by another user
- [ ] Toast shown when open card is deleted
- [ ] WebSocket reconnection restores board room and presence
- [ ] @Mention dropdown only shows workspace members
- [ ] Removed assignee shows "[Removed Member]" fallback text
- [ ] All 10 PRD edge cases have explicit handlers (Claude verified)

---

## Step 18: Deployment

### 18.1 Pre-Deployment Checks

**`[CLAUDE]`** No hardcoded secrets in the codebase:
- Grep for known secret patterns in the source code:
  ```
  Grep for: sk_live_, sk_test_, whsec_, redis://, rediss://
  Expected: zero results in .ts/.tsx files
  Expected: any results are in .env files only
  ```

**`[CLAUDE]`** No `NEXT_PUBLIC_` prefix on secret variables:
- Read `.env.local`
- Confirm: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` have NO `NEXT_PUBLIC_` prefix
- `NEXT_PUBLIC_` variables are embedded in the browser bundle and visible to all users

**`[CLAUDE]`** Production CORS is the Vercel URL (not `localhost` or `"*"`):
- Read `server/.env` (local) and Render environment variable for `ALLOWED_ORIGIN`
- For production: confirm `ALLOWED_ORIGIN=https://your-app.vercel.app`
- NOT `http://localhost:3000` in production

**`[AUTO]`** Production build completes without errors:
```bash
npm run build
# Expected: exits with code 0
# Expected: no TypeScript errors
# Expected: no "Missing environment variable" warnings
```

### 18.2 Manual Deployment Tests

**`[MANUAL]`** Vercel deployment passes build:
1. Push to GitHub
2. Vercel auto-deploys from the main branch
3. Expected: build succeeds (green in Vercel dashboard)
4. Expected: no build errors in the Vercel build log
5. Open the Vercel URL in the browser
6. Expected: app loads with no console errors

**`[MANUAL]`** Convex production deployment:
1. Run `npx convex deploy`
2. Expected: "Successfully deployed" in terminal output
3. Open Convex production dashboard
4. Expected: all 12 tables visible, all functions deployed

**`[MANUAL]`** Clerk webhook is registered and working:
1. Sign up a new user on the deployed Vercel app
2. Open Convex production dashboard → Data → `users` table
3. Expected: the new user's record appears within 5 seconds

**`[MANUAL]`** WebSocket connects to Render:
1. Open the deployed Vercel app
2. Open DevTools → Network → WS tab
3. Sign in and navigate to a board
4. Expected: a WebSocket connection is established to the Render URL
5. Expected: no CORS errors in the console

### 18.3 End-to-End Smoke Test

This is the final test. Every item must pass before the project is considered complete.

**`[E2E]`** Full demo flow on production:

```
Setup:
  - Open deployed Vercel URL in Browser A (signed out)
  - Open deployed Vercel URL in Browser B (signed out, incognito)

Step 1 — Sign up:
  - Browser A: sign up as "User A" with email
  - Expected: user record in Convex production users table
  - Browser A: create workspace "Demo Team" → lands on dashboard

Step 2 — Invite:
  - Browser A: open workspace settings → generate invite link
  - Browser B: open the invite link → sign up as "User B" → accept invite
  - Expected: User B is now in "Demo Team" workspace

Step 3 — Board setup:
  - Browser A: create board "Sprint 1"
  - Browser A: add columns: "Backlog", "In Progress", "Done"
  - Expected (Browser B): board appears on workspace dashboard

Step 4 — Cards:
  - Browser A: add 3 cards to "Backlog"
  - Expected (Browser B): all 3 cards appear without refresh

Step 5 — Presence:
  - Both browsers open the board
  - Expected (Browser A): User B's avatar appears in presence bar
  - Expected (Browser B): User A's avatar appears in presence bar

Step 6 — Real-time card move:
  - Browser A: drag a card from "Backlog" to "In Progress"
  - Expected (Browser B): card moves without refresh, within 500ms

Step 7 — Comment and @mention:
  - Browser A: open a card, add comment "@UserB please check this"
  - Expected (Browser B): notification bell badge increments
  - Expected (Browser B): click bell → see "User A mentioned you in '[card title]'"
  - Expected (Browser B): click notification → navigates to card

Step 8 — Permission enforcement:
  - Browser A: set User B's board permission to "View"
  - Expected (Browser B): drag handles disappear, add card/column controls hidden
  - Browser A (console): manually call moveCard as User B (use User B's token)
  - Expected: FORBIDDEN error returned

Step 9 — Activity log:
  - Open the activity log panel
  - Expected: all actions from this session appear (card created, moved, commented, etc.)
  - Expected: actor names are correct (not IDs)

Step 10 — Dark mode:
  - Toggle dark mode on the deployed app
  - Expected: theme switches correctly on production (not just localhost)
```

All 10 steps must pass. Document any failures and fix before marking Step 18 complete.

### 18.4 Acceptance Criteria

- [ ] `npm run build` exits with code 0
- [ ] No secrets in source code (Claude verified via grep)
- [ ] No `NEXT_PUBLIC_` prefix on secret variables (Claude verified)
- [ ] Vercel deployment green
- [ ] Convex production deployment confirmed (12 tables, all functions)
- [ ] Clerk webhook creates user records in production
- [ ] WebSocket connects to Render without CORS errors
- [ ] All 10 smoke test steps pass on production

---

## 22. Global Acceptance Criteria

The project is **done** only when all of these pass on the production URL:

### Functional Requirements (from PRD success metrics)

- [ ] Two users see the same card move live with no page refresh
- [ ] Comments appear in real time across open sessions
- [ ] Every action (move, edit, comment, assign) is recorded in the activity log with the actor's name
- [ ] A user without edit permissions is blocked from editing — server enforced, not just hidden in UI
- [ ] A user can set up a workspace and board in under 5 minutes

### Security Requirements

- [ ] No secrets committed to the GitHub repository
- [ ] Webhook signature verification confirmed working (400 on tampered request)
- [ ] `createUser` is `internalMutation` — not callable from browser clients
- [ ] `moveCard` validates destination column belongs to same board
- [ ] Activity log has no update or delete mutations
- [ ] CORS configured to exact production origin on Socket.IO server
- [ ] Rate limiting working on WebSocket event handlers
- [ ] `socket.data.userId` set only by auth middleware

### Data Integrity Requirements

- [ ] No orphan records after any cascade delete operation
- [ ] Card positions persist correctly across page refreshes
- [ ] orderIndex reindex occurs when gap falls below 10
- [ ] Activity log entries are append-only (never modified)

### Quality Requirements

- [ ] TypeScript compiles with `strict: true` and zero errors (`npx tsc --noEmit`)
- [ ] `npm run build` completes without errors
- [ ] No `console.error` or unhandled promise rejections in the browser console during normal use
- [ ] App loads at under 3 seconds on a standard connection (Vercel edge network)

---

*All tests in this document must pass before the corresponding implementation step is considered complete. Testing is not a separate phase — it is part of every step.*
