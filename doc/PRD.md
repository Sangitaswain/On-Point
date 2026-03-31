# Product Requirements Document: OnPoint

**Version 1.0 | March 2026**

---

## 1. Product Overview & Vision

OnPoint is a real-time, collaborative project management board. Teams use it to organize work visually using a Kanban-style interface — a horizontal layout of columns containing task cards — and collaborate live without ever needing to refresh the browser.

Every change any team member makes — moving a card, writing a comment, updating a task — is immediately visible to everyone else on the board. This live synchronization is the core value proposition.

**Vision:** A lightweight workspace for small teams that combines task visibility, live communication, and structured workflow — without the bloat of enterprise tools or per-seat pricing.

---

## 2. Problem Statement

Small teams working on projects — whether college assignments, hackathon sprints, or early startup features — lack a tool that gives them real-time task visibility alongside live communication, in a single structured workspace.

Current workarounds (group chats, shared spreadsheets, email threads) create recurring problems:

- **Stale information** — teammates cannot tell what has changed since they last looked
- **Coordination overhead** — constant pinging required just to check status
- **No accountability** — who did what, and when, is invisible
- **Context switching** — bouncing between chat apps, shared docs, and email to piece together project state

Existing solutions are either too complex (enterprise tools like Jira), too expensive for small teams (Notion paid tier), or not purpose-built for real-time collaboration.

---

## 3. Target Users

### Personas

| Persona | Description | Current Behavior |
|---|---|---|
| College project team | 3–6 students coordinating assignments, deadlines, and responsibilities | WhatsApp group + shared Google Doc |
| Hackathon team | 2–8 people coordinating tasks during a 24–48 hour event with everyone online simultaneously | Sticky notes, Notion, or verbal coordination |
| Early-stage dev team | 2–5 developers at an early startup who want task management without per-seat pricing or complex setup | Trello free tier or a shared spreadsheet |
| Freelance collaborators | A designer and developer working together on a client project, needing a shared live workspace | Email threads and Figma comments |

### Shared Traits Across All Personas
- Small teams: 2–8 people, not enterprises
- Want to see what each other is working on without having to ask
- Prefer drag-and-drop visual interfaces over spreadsheet-style lists
- Value speed — they want a working board set up in under 5 minutes
- Do not want to pay per user per month for basic task coordination

---

## 4. Success Metrics

The product is successful when:

1. Two users viewing the same board simultaneously see card changes (moves, edits, new cards) appear instantly without page refresh
2. Comments on a card appear in real time for all users who have that card open
3. Every action — move, edit, comment, assignment — is recorded in the activity log with the actor's name and a timestamp
4. A user with view-only permission cannot move or edit cards; the system enforces this, not just the UI
5. A new user can create a workspace, add a board, and invite a teammate in under 5 minutes

---

## 5. Complete Feature List

### 5.1 Authentication & Onboarding

- Sign up with email and password
- Sign in with email and password
- Sign in with Google (OAuth)
- On first login, user is prompted to either create a new workspace or join an existing one via invite link
- Persistent login session (user does not need to re-authenticate on return visits within session lifetime)

### 5.2 Workspace Management

- Create a workspace with a name; system generates a unique URL slug from the name
- View all workspaces the user belongs to
- Invite members to a workspace by entering their email address
- Generate a shareable invite link for a workspace
- Assign a role to each member at the workspace level:
  - **Owner** — full control, can delete the workspace
  - **Admin** — can manage members and boards
  - **Member** — standard access to boards per board-level permissions
  - **Guest** — restricted access, view-only by default
- Remove a member from the workspace
- Transfer workspace ownership to another member

### 5.3 Workspace Dashboard

- After login, user lands on their workspace dashboard
- Dashboard shows all boards the user has access to within that workspace
- Dashboard shows a count of unread notifications
- User can switch between multiple workspaces from a sidebar

### 5.4 Board Management

- Create a board within a workspace (name required)
- Rename a board
- Delete a board (requires confirmation)
- Set board visibility:
  - **Private** — only explicitly invited members can see this board
  - **Workspace** — all workspace members can see this board
- Set board-level permission for individual members, overriding their workspace role:
  - **Edit** — can create, move, edit, and delete cards and columns
  - **Comment** — can read cards and post comments, cannot move or edit cards
  - **View** — read-only access, no interaction

### 5.5 Column Management

- Add a column to a board (name required)
- Rename a column
- Reorder columns by dragging
- Delete a column
  - If the column contains cards, user sees a confirmation warning: "This column has X cards. Deleting it will permanently delete all cards inside."
  - On confirmation, the column and all its cards are deleted

### 5.6 Card Management

- Add a card to any column (title required)
- Edit a card by clicking it to open a detail modal
- Delete a card (from the modal or from the column context menu)
- Card fields:
  - **Title** — short text, required
  - **Description** — rich text editor with Markdown support (headings, bold, italic, bullet lists, code blocks)
  - **Assignee** — select one workspace member from a dropdown
  - **Labels** — attach one or more color-coded labels (e.g., Bug, Feature, Urgent, Design, Blocked); labels are workspace-scoped
  - **Due date** — date picker; no time component required in v1
- View card history inside the modal: a chronological list of every previous state of the title and description, showing who made the change and when

### 5.7 Drag-and-Drop

- Drag a card from one column to another
- Drag a card to a different position within the same column
- The card's column and position persist after page refresh or re-login
- Dragging is smooth and provides visual feedback (ghost card, drop zone highlight)

### 5.8 Real-Time Collaboration

The following changes propagate instantly to all users currently viewing the same board, with no page refresh required:

| Event | Visible To |
|---|---|
| User opens the board | All users on that board (presence update) |
| User closes the board or disconnects | All users on that board (presence update) |
| Card created | All users on that board |
| Card updated (title, description, assignee, label, due date) | All users on that board |
| Card moved to a new column or position | All users on that board |
| Card deleted | All users on that board |
| Column created | All users on that board |
| Column updated (rename) | All users on that board |
| Column deleted | All users on that board |
| Comment added to a card | All users who have that card open |
| Board chat message sent | All users on that board |
| User assigned to a card or @mentioned | That specific user only (notification) |

### 5.9 Online Presence

- When a user opens a board, their avatar appears in a presence bar at the top of the board view
- When a user closes the board tab or their connection drops, their avatar disappears from the presence bar
- Hovering over an avatar shows the user's display name

### 5.10 Comments

- Post a comment on any card the user has permission to view
- Comments are displayed in chronological order in a thread within the card modal
- Comments appear in real time for all users who have the same card open
- @mention a workspace member in a comment by typing `@` followed by their name; a dropdown of workspace members appears for selection
- Edit a comment (only the comment author can edit their own comment)
- Delete a comment (only the comment author or a board admin can delete)

### 5.11 Board Chat

- A collapsible chat panel on the right side of the board view
- Any board member can send a text message to the board chat
- Messages appear in real time for all users currently on that board
- A typing indicator appears below the chat input when another user is actively typing: "Name is typing…"
- Chat history is persisted; new users joining can scroll up to read previous messages

### 5.12 Activity Log

- A board-level feed showing every action taken on the board in reverse chronological order
- Each entry includes: actor name, action description, affected entity, and timestamp
- Example entries:
  - "Punit moved 'LLM integration' from In Progress to Done"
  - "Aryan added a comment on 'Auth flow'"
  - "Neha was assigned to 'API rate limiting'"
  - "Divya created column 'Backlog'"
  - "Sana deleted card 'Fix login bug'"
- The activity log is append-only; entries are never modified or deleted
- The log is filterable by:
  - Action type (card moved, card edited, comment added, assigned, column changes)
  - User (show only actions by a specific team member)

### 5.13 Notifications

- User receives an in-app notification when they are assigned to a card
- User receives an in-app notification when they are @mentioned in a comment
- Notifications are delivered in real time (user sees the notification without refreshing)
- Unread notification count is shown as a badge on the workspace dashboard
- Clicking a notification takes the user directly to the relevant card

### 5.14 Dark Mode

- Users can toggle between light mode and dark mode
- The selected theme persists across sessions

### 5.15 Mobile Responsiveness

- The application is usable on mobile screen sizes
- On small screens, the Kanban board collapses to a single-column scrollable view (one column visible at a time, with swipe or tab navigation to switch columns)
- Card modals, comments, and chat are fully accessible on mobile

---

## 6. Post-v1 Features (Planned, Not in Scope for Initial Release)

### 6.1 Search

- Search cards across a board by typing keywords
- Results match against card title and description
- Clicking a result opens the card modal

### 6.2 Card Attachments

- Upload one or more files to a card from the card modal
- Supported file types: images, PDFs, documents
- Maximum file size: 10 MB per file
- Attached files are listed in the card modal with filename, size, and upload date
- Any board member with at least Comment permission can download attachments

### 6.3 Board Templates

- When creating a board, user can choose to start from a template instead of a blank board
- Available templates (pre-built column sets):
  - **Software Sprint** — Backlog / In Dev / In Review / Done
  - **Event Planning** — Ideas / To Confirm / Confirmed / Done
  - **College Project** — To Do / In Progress / Review / Submitted

---

## 7. User Stories & Workflows

### 7.1 Onboarding Workflow

1. User navigates to the OnPoint sign-up page
2. User enters their name, email, and password — or clicks "Continue with Google"
3. Account is created; user is signed in
4. System detects this is a first-time login and shows an onboarding prompt:
   - Option A: "Create a new workspace" — user enters a workspace name and proceeds
   - Option B: "Join a workspace" — user pastes an invite link and proceeds
5. User lands on the workspace dashboard

### 7.2 Board Setup Workflow

1. From the workspace dashboard, user clicks "New Board"
2. User enters a board name and selects visibility (Private or Workspace)
3. Board is created and opens, empty
4. User clicks "Add Column" and names the first column (e.g., "To Do")
5. User repeats to add additional columns
6. User clicks "+ Add Card" in a column, types a card title, and presses Enter
7. Card appears in the column

### 7.3 Card Lifecycle Workflow

1. Team member clicks on a card to open the detail modal
2. Member fills in the description, assigns a teammate, adds a label, and sets a due date
3. Member clicks Save — all connected users see the card header update on the board instantly
4. Later, member drags the card to the next column ("In Progress") — all connected users see the card move in real time
5. Activity log records the move: "Punit moved 'Design homepage' from To Do to In Progress"
6. Assigned teammate receives a notification that they were assigned

### 7.4 Live Collaboration Workflow (Two Users)

1. User A and User B both open the same board
2. Both users see each other's avatars in the presence bar at the top of the board
3. User A clicks "+ Add Card" in the "To Do" column and types a title
4. User B sees the new card appear in the column immediately, without refreshing
5. User B opens the card and writes a comment: "@UserA can you clarify the scope here?"
6. User A sees the comment appear live in their open card modal
7. User A receives a notification for the @mention
8. User A replies in the comment thread; User B sees the reply in real time

### 7.5 Permission Enforcement Workflow

1. Workspace owner opens Board Settings and invites a new member with "View" permission
2. The new member (User C) opens the board and can see all columns and cards
3. User C attempts to drag a card to another column — the action is rejected; an error message appears: "You do not have permission to edit this board"
4. User C attempts to open a card and post a comment — this is allowed (Comment permission or above)
5. Workspace admin opens Board Settings and upgrades User C to "Edit" permission
6. User C can now drag cards and edit card fields

### 7.6 Activity Log Review Workflow

1. A team member opens the Activity Log panel on the board
2. They see a reverse-chronological list of all actions taken on the board
3. They filter by action type "Card Moved" to see only card movements
4. They filter by user "Aryan" to see only actions Aryan took
5. Each entry links to the affected card; clicking the entry opens the card modal

---

## 8. Data Flows

### 8.1 User Sign-Up Flow

```
User submits sign-up form
  → Account created in auth system
  → User profile record created (name, email, avatar URL)
  → User session started
  → User redirected to first-login onboarding prompt
```

### 8.2 Workspace Invite Flow

```
Owner enters invitee email in "Invite Members" panel
  → Invite record created (workspace ID, invitee email, role, expiry timestamp)
  → Invitation email sent to invitee with a unique invite link
  → Invitee clicks link → system validates link (not expired, not already used)
  → If valid: workspace_members record created (workspace ID, user ID, role)
  → Invitee redirected to the workspace dashboard
  → If invalid: error page shown ("This invite link is no longer valid")
```

### 8.3 Card Move Flow

```
User drags card to a new column and releases
  → Client sends CARD_MOVED event (card ID, new column ID, new position index)
  → Server receives event
  → Server checks: does this user have Edit permission on this board?
      → If No: server sends error back to client; client reverts card to original position; error toast shown
      → If Yes:
          → Server updates card record (column ID, position index)
          → Server appends activity log entry (actor, "moved", card ID, from column, to column, timestamp)
          → Server broadcasts CARD_MOVED event to all users in the board room
          → All connected clients update the card's position in their board view
```

### 8.4 Comment & @Mention Flow

```
User types a comment and clicks Submit
  → Client sends comment content to server
  → Server checks: does this user have Comment or Edit permission?
      → If No: error returned, comment not saved
      → If Yes:
          → Comment record created (card ID, author ID, body, timestamp)
          → Server broadcasts COMMENT_ADDED event to all users who have that card open
          → Server scans comment body for @mentions
          → For each valid @mention (mentioned user is a workspace member):
              → Notification record created for mentioned user
              → NOTIFICATION_SENT event delivered to mentioned user's live session
              → Unread notification count incremented for mentioned user
```

### 8.5 Card Assignment Notification Flow

```
User opens a card modal and selects an assignee from the dropdown
  → Client sends CARD_UPDATED event (card ID, field: "assignee", new value: user ID)
  → Server validates Edit permission
  → Server updates card record (assignee_id)
  → Server appends activity log entry ("assigned user X to card Y")
  → Server broadcasts CARD_UPDATED to all users in board room
  → Server creates notification record for the newly assigned user
  → NOTIFICATION_SENT event delivered in real time to assigned user's session
```

### 8.6 Activity Log Write Flow

```
Any card, column, or comment mutation completes successfully
  → Server appends an activity log entry:
      Fields: board_id, actor_id, action_type, entity_type, entity_id, metadata (previous/new values), timestamp
  → Activity log entry is never modified or deleted after creation
  → Activity log view queries entries for the board in reverse chronological order
  → Filters (action type, user) applied at query time
```

### 8.7 Presence Flow

```
User opens a board page
  → Client connects to the board's real-time room
  → Server records user as present on that board (in-memory presence store)
  → Server broadcasts PRESENCE_UPDATE (user joined) to all other users in the board room
  → All connected clients add the user's avatar to the presence bar

User closes the board tab or loses connection
  → Server detects disconnection
  → Server removes user from the board's presence store
  → Server broadcasts PRESENCE_UPDATE (user left) to all remaining users in the board room
  → All connected clients remove the user's avatar from the presence bar

User reconnects (returns to board after brief disconnection)
  → Client reconnects and re-joins the board room
  → Client fetches the current board state (cards, columns) to sync any missed updates
  → Presence bar updates to show the user again
```

---

## 9. Edge Cases & Error Scenarios

### 9.1 Concurrent Card Edits (Same Field)

**Scenario:** User A and User B both open the same card and edit the title at the same time.

**Behavior:**
- The server processes writes sequentially
- The last write wins — whichever update the server receives last becomes the stored value
- Both writes are recorded in the activity log (both actors' edits are visible in the card history)
- The user whose write was overridden will see their view corrected to match the final server state — their optimistic update is replaced with the broadcast value
- No data is lost from the log; both attempts are auditable

### 9.2 Concurrent Card Ordering Conflict

**Scenario:** User A moves Card 1 to position 2, and User B moves Card 2 to position 2, simultaneously.

**Behavior:**
- The server processes the writes one at a time
- After both writes, positions are recalculated to ensure no two cards share a position
- Both clients receive a corrected order reflecting the final state
- No cards are lost or duplicated

### 9.3 WebSocket Disconnection Mid-Session

**Scenario:** A user's internet connection drops while they have a board open.

**Behavior:**
- The user's avatar disappears from the presence bar for other users immediately
- If the connection is restored, the client automatically reconnects to the board room
- On reconnect, the client fetches fresh board state to catch up on any changes made during the disconnection
- The user's avatar reappears in the presence bar for other users
- If reconnection fails repeatedly, the user is shown a banner: "You are offline. Changes may not sync until your connection is restored."

### 9.4 Column Deletion with Cards

**Scenario:** A user attempts to delete a column that has 5 cards inside.

**Behavior:**
- System shows a confirmation dialog: "This column contains 5 cards. Deleting it will permanently delete all cards inside. This cannot be undone."
- If the user cancels: no change is made
- If the user confirms: the column and all 5 cards are deleted; the activity log records the column deletion (but does not enumerate every card deleted, to avoid log spam)
- All users viewing the board see the column and cards disappear in real time

### 9.5 Unauthorized Action Attempt

**Scenario:** A user with View-only permission attempts to move a card or edit a card field.

**Behavior:**
- The action is rejected by the server — no data is written
- The user's board view reverts to the state before the attempted action (the card snaps back to its original position if drag-and-drop was attempted)
- An error message is shown to the user: "You don't have permission to edit this board."
- The rejection is not logged in the activity log (only successful mutations are recorded)

### 9.6 Invalid or Expired Invite Link

**Scenario:** A user clicks a workspace invite link that has expired or has already been used.

**Behavior:**
- System shows an error page: "This invite link is no longer valid. Ask the workspace owner or an admin for a new invite."
- No workspace membership is created

### 9.7 Duplicate Workspace Slug

**Scenario:** A user creates a workspace named "My Team" but the slug `my-team` is already taken by another workspace.

**Behavior:**
- System automatically generates an alternative slug (e.g., `my-team-2`, `my-team-3`) and uses it
- The user is not interrupted; the workspace is created with the available slug
- The user can view and change the slug in workspace settings after creation

### 9.8 @Mention of a Non-Member

**Scenario:** A user types `@username` in a comment, but that username does not belong to any workspace member.

**Behavior:**
- The @mention dropdown shows no match; the user sees "No members found"
- If the user types the full text anyway and submits, it is stored as plain text — not as an active @mention
- No notification is sent
- No error is shown to the user

### 9.9 Assigning a Card to a Removed Member

**Scenario:** A card is assigned to User X, and then User X is removed from the workspace.

**Behavior:**
- The card retains the assignee field as-is (the name is shown as "[Removed Member]" or the last known display name)
- The assignee dropdown on the card no longer shows the removed user as an option
- The removed user loses access to the workspace and its boards
- No notification is sent to the removed user

### 9.10 Deleting a Card That Another User Has Open

**Scenario:** User A deletes a card while User B has that card's modal open.

**Behavior:**
- The CARD_DELETED event is broadcast to all users on the board
- User B's card modal closes automatically and shows a message: "This card has been deleted by another user."
- The card disappears from User B's board view

---

## 10. Out of Scope for v1

The following features are planned for future releases but will not be included in the initial launch:

- **Email notifications** — all notifications in v1 are in-app only; no emails are sent for assignments, mentions, or due date reminders
- **Card versioning snapshots** — the activity log and card history tab cover the core audit use case; full snapshot versioning is deferred
- **Time tracking** — logging hours or time estimates on cards is not in v1
- **Reporting & analytics** — no dashboards for velocity, throughput, or team workload
- **Calendar view** — no calendar rendering of cards by due date
- **Guest access without an account** — all users must sign up; no read-only public board links in v1
- **Card dependencies / blocking relationships** — no linking of cards as "blocks" or "blocked by"
- **Recurring tasks** — no option to automatically recreate a card on a schedule
