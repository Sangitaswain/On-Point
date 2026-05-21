# Technical Remediation Plan

**Project:** OnPoint  
**Created:** May 21, 2026  
**Purpose:** Step-by-step plan to fix the highest-risk security, data integrity, scalability, linting, and testing gaps found during the codebase analysis.

---

## Current Baseline

### Checks That Pass

- `npx tsc --noEmit`
- `npm run build`
- `cd server && npm run build`

### Checks That Fail Or Are Missing

- `npm run lint` currently fails with React hook/compiler errors and lint scope issues.
- There are no automated test files.
- The root folder is not currently a Git repository.
- The README is stale relative to the current implementation and dependency versions.

### Main Risk Areas

1. Backend security and data integrity.
2. Socket.IO authorization.
3. Convex identity model consistency.
4. Convex query scalability.
5. Lint cleanliness.
6. Test coverage.
7. Documentation drift.

---

## Phase 0: Preparation

### Goal

Create a safe working baseline before changing behavior.

### Steps

1. Confirm environment variables exist locally:
   - Root `.env.local`
   - `server/.env`

2. Run baseline checks:

   ```bash
   npx tsc --noEmit
   npm run build
   npm run lint
   cd server
   npm run build
   ```

3. Save the current lint output for comparison.

4. If this folder should be version-controlled, initialize or reconnect Git before making large changes:

   ```bash
   git init
   git status
   ```

### Acceptance Criteria

- Passing baseline commands are known.
- Current lint failures are captured.
- Any untracked or generated files are understood before edits begin.

---

## Phase 1: Fix Critical Backend Data Integrity

### Finding

`convex/cards.ts` `moveCard` validates edit permission on the card's current board, but it does not validate that `newColumnId` belongs to the same board. This can move a card into a column from another board, corrupting board/card relationships.

### Files

- `convex/cards.ts`

### Implementation Steps

1. In `moveCard`, load the destination column before patching the card.

2. If destination column does not exist, throw `NOT_FOUND`.

3. Compare `toColumn.boardId` with `card.boardId`.

4. If they differ, throw `INVALID_INPUT` or `FORBIDDEN`.

5. Only patch the card after the board match is confirmed.

6. Keep the activity log unchanged, but use the already-loaded destination column instead of fetching it after the patch.

### Suggested Shape

```ts
const toColumn = await ctx.db.get(args.newColumnId)
if (!toColumn) {
  throw new ConvexError({ code: 'NOT_FOUND', message: 'Destination column not found' })
}

if (toColumn.boardId !== card.boardId) {
  throw new ConvexError({
    code: 'INVALID_INPUT',
    message: 'Cannot move a card to a column on another board',
  })
}
```

### Verification

```bash
npx tsc --noEmit
npm run build
```

### Acceptance Criteria

- A card cannot be moved to a column from a different board.
- Existing same-board drag-and-drop still works.
- The mutation still rejects users without edit permission.

---

## Phase 2: Lock Down Clerk Webhook User Mutations

### Finding

`createUser` and `updateUser` in `convex/users.ts` are public Convex mutations. The comments say security is enforced by the Next.js webhook route, but public mutations are still part of the client-callable API.

### Files

- `convex/users.ts`
- `app/api/webhooks/clerk/route.ts`
- `convex/_generated/api.d.ts` and generated files after Convex regeneration

### Preferred Fix

Convert webhook-only mutations to `internalMutation` and call them from the webhook route through `internal`.

### Implementation Steps

1. Change imports in `convex/users.ts`:

   ```ts
   import { internalMutation, mutation, query } from './_generated/server'
   ```

2. Convert:

   - `createUser = mutation(...)` to `createUser = internalMutation(...)`
   - `updateUser = mutation(...)` to `updateUser = internalMutation(...)`

3. Keep `syncUser` public because it is called by authenticated frontend code.

4. Update the webhook route to import `internal`:

   ```ts
   import { internal } from '@/convex/_generated/api'
   ```

5. Change webhook calls:

   ```ts
   await convex.mutation(internal.users.createUser, ...)
   await convex.mutation(internal.users.updateUser, ...)
   ```

6. Regenerate Convex types if needed:

   ```bash
   npx convex codegen
   ```

### Important Note

This project currently stores `clerkId` as the Clerk user ID from webhooks and as `identity.subject` from Convex auth. Phase 3 addresses whether that field should migrate to `tokenIdentifier`.

### Verification

```bash
npx tsc --noEmit
npm run build
```

Manual checks:

- Clerk webhook still creates a user record.
- Clerk webhook still updates name/avatar.
- Browser clients cannot call `api.users.createUser` or `api.users.updateUser`.

### Acceptance Criteria

- Webhook-only mutations are internal.
- Public user sync still works.
- Webhook route continues to verify Svix signatures before calling Convex.

---

## Phase 3: Normalize Convex Auth Identity Usage

### Finding

The generated Convex guidelines say to prefer `identity.tokenIdentifier` for auth-linked lookup and ownership checks. Current code uses `identity.subject` for `users.clerkId`.

### Files

- `convex/schema.ts`
- `convex/lib/auth.ts`
- `convex/users.ts`
- `convex/workspaces.ts`
- `convex/notifications.ts`
- `app/api/webhooks/clerk/route.ts`

### Decision Required

Pick one identity strategy and apply it consistently.

### Option A: Minimal Change

Keep `users.clerkId` as Clerk `subject`, but document this as a deliberate exception because webhooks naturally provide Clerk user IDs.

Pros:

- Small change.
- No migration needed.

Cons:

- Conflicts with generated Convex guidance.
- Future auth provider changes are riskier.

### Option B: Recommended Long-Term Change

Add `tokenIdentifier` to `users` and make it the canonical Convex auth lookup key.

Pros:

- Matches Convex guidance.
- Cleaner if auth providers or issuers change.

Cons:

- Requires a migration/backfill plan.
- Webhook cannot directly know Convex `tokenIdentifier` unless its format is derived and verified for Clerk.

### Recommended Step-By-Step Plan

1. Add an optional `tokenIdentifier` field to `users`.

2. Add a schema index:

   ```ts
   .index('by_token_identifier', ['tokenIdentifier'])
   ```

3. Update `syncUser` to write `identity.tokenIdentifier`.

4. Update `requireUser` to first look up by `tokenIdentifier`, then fall back to `clerkId` during migration.

5. Backfill existing users during sign-in through `syncUser`.

6. After all active users have `tokenIdentifier`, remove fallback if desired.

### Verification

```bash
npx tsc --noEmit
npm run build
```

Manual checks:

- Existing users can still sign in.
- New users are created and synced.
- Workspace membership still resolves correctly.

### Acceptance Criteria

- Auth lookup behavior is consistent and documented.
- No existing user loses access to their workspaces.
- `requireUser` remains the single source of truth for authenticated user lookup.

---

## Phase 4: Add Socket.IO Authorization

### Finding

The Socket.IO server validates Clerk tokens, but it does not validate whether a user can access a specific board room. Any authenticated user can emit `JOIN_BOARD` for any board ID and receive or broadcast socket events.

### Files

- `server/src/middleware/auth.ts`
- `server/src/handlers/connection.ts`
- `server/src/presence.ts`
- Root Convex functions may need a server-callable authorization query.

### Design Options

### Option A: Let Convex Own Authorization

Create a Convex query/action that answers: "Can Clerk user X view board Y?"

Socket server calls that before joining a room.

Pros:

- Reuses the existing Convex permission model.
- Avoids duplicating workspace/board logic in the Socket.IO server.

Cons:

- Adds latency to room joins.
- Requires server-side Convex client configuration.

### Option B: Move Ephemeral Events Through Convex

Reduce Socket.IO trust by using it only for presence/typing, while durable board updates come from Convex.

Pros:

- Smaller authorization surface.

Cons:

- Still need authorization for presence/typing.
- More frontend behavior changes.

### Recommended Implementation

Use Option A.

### Implementation Steps

1. Add a Convex query or action that accepts:

   - `boardId`
   - Clerk subject or token identifier from server auth

2. The function should:

   - Find the internal user.
   - Resolve board permission.
   - Return `true` if permission is at least `view`.

3. Add Convex client support in the Socket.IO server.

4. In `JOIN_BOARD`, before `socket.join`, call the authorization check.

5. If unauthorized:

   - Do not join room.
   - Emit an error event.
   - Optionally disconnect the socket after repeated unauthorized attempts.

6. For every event carrying `boardId`, ensure the socket is already joined to that room before broadcasting:

   ```ts
   if (!socket.rooms.has(`board:${boardId}`)) return
   ```

7. Rate-limit `CARD_DRAGGING` and `CARD_DRAG_CANCELLED`, or add a separate lighter limit for high-frequency drag previews.

### Presence Fix

Current presence is keyed by `userId`, so multiple tabs/devices for the same user can incorrectly remove presence when one socket leaves.

Change presence to track socket IDs per user:

```ts
boardId -> userId -> { userName, socketIds: Set<string> }
```

Only emit `LEAVE` when the final socket for that user leaves the board.

### Verification

```bash
cd server
npm run build
```

Manual checks:

- Authorized board members can join and see presence.
- A logged-in non-member cannot join a private board room.
- Multiple tabs for the same user do not flicker presence incorrectly.

### Acceptance Criteria

- Socket room joins are authorized.
- Socket event broadcasts are limited to joined rooms.
- Unauthorized users cannot observe board presence, typing, or drag events.
- Presence handles multiple tabs/devices correctly.

---

## Phase 5: Fix Convex Query Scalability

### Finding

Several Convex functions use unbounded `.collect()`. The most critical scans are notification cleanup in card and board deletion.

### Files

- `convex/schema.ts`
- `convex/cards.ts`
- `convex/boards.ts`
- `convex/workspaces.ts`
- `convex/columns.ts`
- `convex/comments.ts`

### Immediate Schema Additions

Add indexes to `notifications`:

```ts
.index('by_card', ['cardId'])
.index('by_board', ['boardId'])
```

Optional:

```ts
.index('by_board_and_user', ['boardId', 'userId'])
```

### Implementation Steps

1. Add `notifications.by_card` and `notifications.by_board`.

2. Replace full notification table scans:

   - In `deleteCard`, query notifications by `cardId`.
   - In `deleteBoard`, query notifications by `boardId`.

3. Review list queries:

   - `cards.listByBoard`
   - `columns.listByBoard`
   - `comments.listByCard`
   - `workspaces.listMembers`
   - `boards.listByWorkspace`

4. Decide bounded limits for each list.

5. For naturally unbounded views, use pagination.

6. For cascade deletes, consider batched scheduled deletion if boards/workspaces can grow large.

### Verification

```bash
npx tsc --noEmit
npm run build
```

Manual checks:

- Delete card with notifications.
- Delete board with notifications.
- Delete workspace with multiple boards/cards/comments.

### Acceptance Criteria

- No full-table scans for notification cleanup.
- Main list queries are either bounded or intentionally documented.
- Large deletes have a clear batching strategy if needed.

---

## Phase 6: Fix Lint Configuration And React Hook Issues

### Finding

`npm run lint` fails. It also scans generated or unrelated nested files under `clerk-nextjs/.next`.

### Files

- `eslint.config.mjs`
- `components/board/BoardView.tsx`
- `hooks/useBoardRoom.ts`
- `components/providers/SocketProvider.tsx`
- `components/card/MentionList.tsx`
- `app/(app)/[workspaceSlug]/board/[boardId]/settings/page.tsx`
- Other warning files from lint output

### Lint Scope Fix

Update `eslint.config.mjs` ignores:

```ts
globalIgnores([
  '.next/**',
  '**/.next/**',
  'out/**',
  'build/**',
  'dist/**',
  'next-env.d.ts',
  'convex/_generated/**',
  'clerk-nextjs/**',
])
```

### React Hook Fix Strategy

Do not silence React compiler rules globally. Fix the actual patterns.

Common issues:

- Synchronous `setState` inside effects.
- Missing hook dependencies.
- Derived state stored in local state.

### Suggested Fixes

1. `BoardView`
   - Review whether `localCards` and `localColumns` can be derived when not dragging.
   - If local state is required for drag previews, isolate sync behavior behind event-driven updates or a reducer.
   - Avoid immediate state writes inside `useEffect`.

2. `useBoardRoom`
   - Initialize `connected` from `socket.connected` in `useState`.
   - Avoid calling `setConnected(true)` synchronously inside effect setup.

3. `SocketProvider`
   - Include Clerk user fields in dependencies.
   - Consider deriving disconnected state from `isSignedIn` and socket lifecycle callbacks.

4. `MentionList`
   - Reset selected index through keying, reducer, or event handling rather than direct effect state reset.

5. Board settings page
   - Avoid copying `board.title` into state synchronously in an effect.
   - Initialize form state when entering edit mode or use controlled fallback values.

### Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```

### Acceptance Criteria

- `npm run lint` exits with code 0.
- No generated or nested sample app files are linted.
- No broad disable comments are added unless they are tightly justified.

---

## Phase 7: Add Automated Tests

### Finding

The project has a detailed testing plan, but no actual test setup or test files are present.

### Files

- `package.json`
- New test config files
- New test files

### Recommended Test Stack

For Convex:

- `convex-test`
- `vitest`
- `@edge-runtime/vm`

For UI:

- Testing Library can be added later.

For E2E:

- Playwright can be added after local auth/test user setup is stable.

### Minimum First Test Set

1. Convex permission tests:
   - View users cannot move cards.
   - Comment users cannot edit cards.
   - Edit users can move cards.

2. Card move data integrity:
   - Moving to a column on the same board succeeds.
   - Moving to a column on another board fails.

3. Notification cleanup:
   - Deleting a card removes only notifications for that card.
   - Deleting a board removes only notifications for that board.

4. Webhook route:
   - Missing Svix headers returns `400`.
   - Invalid signature returns `400`.

5. Utility tests:
   - `computeOrderIndex`
   - permission helpers
   - mention extraction

### Package Scripts

Add scripts such as:

```json
{
  "test": "vitest",
  "test:watch": "vitest --watch",
  "test:convex": "vitest convex"
}
```

### Verification

```bash
npm test
npm run lint
npm run build
```

### Acceptance Criteria

- At least critical Convex authorization paths are covered.
- The cross-board move bug has a regression test.
- Tests run locally without requiring production services.

---

## Phase 8: Update Documentation

### Finding

README and planning docs are behind the code. README says Next.js 14 and Steps 1-8 implemented, but the app uses Next 16.2.2 and includes later features such as presence, comments, notifications, chat, and activity logs.

### Files

- `README.md`
- `doc/TESTING_PLAN.md`
- Potentially `doc/IMPLEMENTATION_PLAN.md`

### Steps

1. Update framework versions:

   - Next.js 16.2.2
   - React 19.2.4
   - Convex 1.34.1
   - Clerk Next.js 7.0.8

2. Update feature status table to match actual code.

3. Update setup instructions if Next 16 or Convex requires changed behavior.

4. Document the two realtime layers:

   - Convex for durable reactive data.
   - Socket.IO for authorized ephemeral events.

5. Document current test commands after Phase 7.

### Verification

Manual review only.

### Acceptance Criteria

- README accurately matches the codebase.
- Test instructions are executable.
- Security-sensitive architecture decisions are documented.

---

## Phase 9: Final Hardening Pass

### Goal

Confirm the app is clean, secure enough for demo/portfolio use, and not carrying obvious operational gaps.

### Checklist

Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
cd server
npm run build
```

Security review:

- No hardcoded secrets.
- `.env*` files are ignored.
- Webhook route verifies Svix signatures.
- Webhook-only Convex mutations are internal.
- Socket.IO joins are authorized.
- Socket.IO events cannot broadcast to rooms the socket has not joined.
- Card moves validate destination board.
- Convex functions do not accept user IDs for authorization decisions.

Data review:

- Deletes do not leave obvious orphan records.
- Notification cleanup uses indexes.
- Large deletes have a batching strategy if needed.
- Order index reindex behavior is understood and tested.

UX review:

- View-only users cannot see edit controls.
- Comment users can comment but cannot edit cards.
- Permission changes update without refresh.
- Presence works across two browser sessions.
- Chat and activity panels behave on desktop and mobile.

### Acceptance Criteria

- All automated checks pass.
- Critical manual security flows pass.
- README and testing docs are current.

---

## Suggested Work Order Summary

1. Fix `moveCard` cross-board validation.
2. Convert Clerk webhook mutations to internal mutations.
3. Decide and implement Convex identity normalization.
4. Add Socket.IO board authorization.
5. Add notification indexes and remove full-table notification scans.
6. Fix ESLint ignore scope and React hook/compiler violations.
7. Add minimum automated tests.
8. Update README and testing documentation.
9. Run final hardening checks.

---

## Tracking Table

| Phase | Area | Status | Primary Files |
|---|---|---:|---|
| 0 | Preparation | Not started | package scripts, env |
| 1 | Card move integrity | Not started | `convex/cards.ts` |
| 2 | Webhook mutation security | Not started | `convex/users.ts`, webhook route |
| 3 | Convex identity consistency | Not started | `convex/lib/auth.ts`, schema |
| 4 | Socket.IO authorization | Not started | `server/src/*` |
| 5 | Convex scalability | Not started | schema, cards, boards |
| 6 | Lint cleanup | Not started | eslint config, React files |
| 7 | Automated tests | Not started | test config and test files |
| 8 | Documentation | Not started | README, docs |
| 9 | Final hardening | Not started | all |

