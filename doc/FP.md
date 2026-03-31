# Frontend Plan (FP): OnPoint

**Version 1.0 | March 2026**
**References:** PRD.md (what to build) | TOOLS_AND_TECHNOLOGIES.md (how to build it)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [Environment Variables](#3-environment-variables)
4. [App Shell & Providers](#4-app-shell--providers)
5. [Routing Architecture](#5-routing-architecture)
6. [Pages](#6-pages)
7. [Component Architecture](#7-component-architecture)
8. [State Management Strategy](#8-state-management-strategy)
9. [Drag-and-Drop Implementation](#9-drag-and-drop-implementation)
10. [Rich Text Editor Integration](#10-rich-text-editor-integration)
11. [Socket.IO Client Integration](#11-socketio-client-integration)
12. [Convex Reactive Queries on the Frontend](#12-convex-reactive-queries-on-the-frontend)
13. [Dark Mode](#13-dark-mode)
14. [Mobile Responsiveness](#14-mobile-responsiveness)
15. [Edge Case Handling in the UI](#15-edge-case-handling-in-the-ui)
16. [Page-by-Page Implementation Checklist](#16-page-by-page-implementation-checklist)

---

## 1. Overview

The frontend is a Next.js 14 App Router application. It is the only surface users interact with. Every screen, interaction, form, and animation described in the PRD is implemented here using React components, Tailwind CSS, and shadcn/ui.

The frontend's two most critical responsibilities:
1. **Real-time UI** — keeping all board data in sync across multiple connected users without page refreshes
2. **Permission-gated interactions** — never showing users controls for actions they are not permitted to take (UI gates), while ensuring the server is the ultimate enforcer (backend gates)

The frontend does not contain business logic. It delegates every data read to Convex reactive queries and every write to Convex mutations. It delegates every ephemeral real-time event (card moves, presence, chat) to Socket.IO.

---

## 2. Project Structure

```
onpoint/
├── app/                              ← Next.js App Router root
│   ├── layout.tsx                    ← Root layout: providers, fonts, metadata
│   ├── page.tsx                      ← Marketing/landing page or redirect to /sign-in
│   ├── (auth)/                       ← Route group: unauthenticated pages
│   │   ├── sign-in/
│   │   │   └── page.tsx              ← Clerk sign-in embed
│   │   └── sign-up/
│   │       └── page.tsx              ← Clerk sign-up embed
│   ├── onboarding/
│   │   └── page.tsx                  ← First-login: create or join workspace
│   ├── (app)/                        ← Route group: authenticated app shell
│   │   ├── layout.tsx                ← App shell: sidebar + notification badge
│   │   ├── [workspaceSlug]/
│   │   │   ├── page.tsx              ← Workspace dashboard
│   │   │   ├── settings/
│   │   │   │   └── page.tsx          ← Workspace settings (members, roles, invite)
│   │   │   └── board/
│   │   │       └── [boardId]/
│   │   │           ├── page.tsx      ← Board view (Kanban)
│   │   │           └── settings/
│   │   │               └── page.tsx  ← Board settings (members, permissions)
│   └── api/
│       └── webhooks/
│           └── clerk/
│               └── route.ts          ← Clerk user.created webhook handler
├── components/
│   ├── providers/
│   │   ├── ConvexClerkProvider.tsx   ← Wraps app with ConvexProviderWithClerk
│   │   ├── SocketProvider.tsx        ← Creates socket, provides via context
│   │   └── ThemeProvider.tsx         ← next-themes dark mode provider
│   ├── layout/
│   │   ├── AppSidebar.tsx            ← Workspace list + nav links
│   │   ├── NotificationBell.tsx      ← Bell icon with unread badge
│   │   └── UserMenu.tsx              ← Avatar dropdown (profile, sign out)
│   ├── workspace/
│   │   ├── WorkspaceDashboard.tsx    ← Board grid + workspace header
│   │   ├── BoardCard.tsx             ← Single board preview card
│   │   ├── CreateBoardDialog.tsx     ← "New Board" dialog (name + visibility)
│   │   ├── InviteMemberDialog.tsx    ← Email invite + invite link
│   │   └── MembersList.tsx           ← Member rows with role selector + remove
│   ├── board/
│   │   ├── BoardView.tsx             ← DndContext wrapper, column list, presence bar
│   │   ├── PresenceBar.tsx           ← Online user avatars
│   │   ├── BoardHeader.tsx           ← Board title, settings link, filter controls
│   │   ├── ActivityLogPanel.tsx      ← Sliding panel with filterable log feed
│   │   └── BoardChatPanel.tsx        ← Collapsible right-side chat
│   ├── column/
│   │   ├── Column.tsx                ← SortableContext wrapper + column header + card list
│   │   ├── ColumnHeader.tsx          ← Editable column title + delete button
│   │   ├── AddColumnButton.tsx       ← Inline column creation input
│   │   └── DeleteColumnDialog.tsx    ← Confirmation dialog with card count warning
│   ├── card/
│   │   ├── CardItem.tsx              ← Draggable card preview (title, labels, assignee avatar)
│   │   ├── CardModal.tsx             ← Full card detail modal (tabs: details / history)
│   │   ├── CardDetailsTab.tsx        ← Description editor, assignee, labels, due date
│   │   ├── CardHistoryTab.tsx        ← Chronological list of field changes
│   │   ├── CommentThread.tsx         ← Comment list + add comment input
│   │   ├── CommentItem.tsx           ← Single comment with edit/delete controls
│   │   ├── LabelPicker.tsx           ← Multi-select label popover
│   │   ├── AssigneePicker.tsx        ← Searchable member dropdown
│   │   └── AddCardInput.tsx          ← Inline card creation input at bottom of column
│   ├── notifications/
│   │   ├── NotificationList.tsx      ← Dropdown list of in-app notifications
│   │   └── NotificationItem.tsx      ← Single notification row with link
│   ├── chat/
│   │   ├── ChatPanel.tsx             ← Full chat panel component
│   │   ├── ChatMessage.tsx           ← Single chat message bubble
│   │   └── ChatInput.tsx             ← Input box with typing indicator emit
│   └── ui/                           ← shadcn/ui components (Button, Dialog, etc.)
├── hooks/
│   ├── useSocket.ts                  ← Returns socket instance from SocketProvider
│   ├── useBoardRoom.ts               ← Joins/leaves board room, handles all board events
│   ├── usePresence.ts                ← Manages local presence state for a board
│   ├── useOptimisticCards.ts         ← Merges Convex card data with optimistic updates
│   ├── useTypingIndicator.ts         ← Emits TYPING_START/STOP, reads typing state
│   └── useNotifications.ts           ← Subscribes to notification count + list
├── lib/
│   ├── socket.ts                     ← Socket.IO client factory (singleton)
│   ├── orderIndex.ts                 ← Gap strategy: compute orderIndex for drag drops
│   ├── slugify.ts                    ← Converts workspace name → URL slug
│   ├── permissions.ts                ← Client-side permission helpers (hide/show controls)
│   └── formatActivityEntry.ts        ← Renders activity log metadata → human-readable string
├── types/
│   └── index.ts                      ← Shared TypeScript types (SocketEvent payloads, etc.)
├── convex/                           ← Convex backend (schema + functions) — see BP.md
├── middleware.ts                     ← Clerk auth middleware: protect (app) routes
├── tailwind.config.ts
├── next.config.ts
└── .env.local                        ← All environment variables (never committed)
```

---

## 3. Environment Variables

All variables are set in `.env.local` for development and in the Vercel dashboard for production.

| Variable | Where Used | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client & server | Clerk auth initialization |
| `CLERK_SECRET_KEY` | Server only (API routes) | Clerk webhook verification (server-side SDK) |
| `CLERK_WEBHOOK_SECRET` | Server only (API routes) | Validates incoming Clerk webhook signatures |
| `NEXT_PUBLIC_CONVEX_URL` | Client & server | Convex deployment endpoint |
| `NEXT_PUBLIC_SOCKET_URL` | Client only | Render-hosted Socket.IO server URL |

No secret keys are ever exposed in `NEXT_PUBLIC_` variables. The Clerk secret key and webhook secret are only accessed in Next.js API routes (server-only execution).

---

## 4. App Shell & Providers

### 4.1 Root Layout (`app/layout.tsx`)

The root layout wraps the entire application. Provider order matters:

```
<html>
  <body>
    <ThemeProvider>              ← next-themes: provides dark/light mode
      <ConvexClerkProvider>      ← ClerkProvider inside ConvexProviderWithClerk
        {children}
      </ConvexClerkProvider>
    </ThemeProvider>
  </body>
</html>
```

`ThemeProvider` must be outermost so dark mode classes are applied before Clerk or Convex render anything.

### 4.2 ConvexClerkProvider (`components/providers/ConvexClerkProvider.tsx`)

A thin wrapper:
```tsx
// Wraps the app so ConvexProviderWithClerk makes the Clerk JWT available
// to every Convex query and mutation automatically.
export function ConvexClerkProvider({ children }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
```

### 4.3 SocketProvider (`components/providers/SocketProvider.tsx`)

A React context that holds a single Socket.IO socket instance for the entire app. The socket is created once (singleton via `lib/socket.ts`) and provided to all components.

- Socket is created lazily on first access
- On auth state change (sign out), socket is disconnected
- The Clerk JWT is fetched from `useAuth().getToken()` and passed as `socket.auth.token` at connection time
- If the token expires mid-session, the socket reconnects with a fresh token

### 4.4 Authenticated App Layout (`app/(app)/layout.tsx`)

All authenticated routes share this layout. Contains:
- `AppSidebar` — workspace list, nav links (dashboard, boards)
- `NotificationBell` — subscribes to unread notification count via Convex reactive query
- `UserMenu` — avatar + sign-out
- Middleware (`middleware.ts`) redirects unauthenticated users to `/sign-in` before this layout renders

---

## 5. Routing Architecture

```
/                        → Redirect to /sign-in (if not authed) or /[workspaceSlug] (if authed)
/sign-in                 → Clerk sign-in UI
/sign-up                 → Clerk sign-up UI
/onboarding              → First-login workspace creation/join (protected: must be signed in)
/[workspaceSlug]         → Workspace dashboard
/[workspaceSlug]/settings → Workspace settings (members, roles, invite link)
/[workspaceSlug]/board/[boardId]          → Board Kanban view
/[workspaceSlug]/board/[boardId]/settings → Board settings (permissions)
/invite/[token]          → Workspace invite acceptance page
```

### 5.1 Middleware (`middleware.ts`)

Clerk's Next.js middleware protects all `(app)` routes. If a user hits any `/(app)/...` path without a valid session, they are redirected to `/sign-in`.

The `/onboarding` route is also protected (must be signed in) but is exempt from the workspace redirect — a freshly signed-up user who has no workspace must be routed here.

### 5.2 First-Login Detection

After sign-in, check in the workspace dashboard page: if the user has no workspace memberships (queried via Convex), redirect to `/onboarding`. This check happens in a server component using `auth()` from Clerk.

---

## 6. Pages

### 6.1 Sign-In / Sign-Up Pages

These pages embed Clerk's hosted components:
```tsx
// app/(auth)/sign-in/page.tsx
import { SignIn } from '@clerk/nextjs'
export default function SignInPage() {
  return <SignIn afterSignInUrl="/onboarding" />
}
```

Clerk handles all form rendering, validation, error messages, and OAuth flows. No custom form code is written.

### 6.2 Onboarding Page (`/onboarding`)

**Renders:** Two choices
- **"Create a workspace"** — shows an input for workspace name. On submit, calls `createWorkspace` Convex mutation. On success, redirects to `/[newSlug]`.
- **"Join a workspace"** — shows an input to paste an invite link. On submit, extracts the token and calls `acceptInvite` Convex mutation. On success, redirects to `/[workspaceSlug]`.

**First-login gate:** If the user already has a workspace (Convex query returns results), skip this page and redirect to their workspace dashboard.

### 6.3 Workspace Dashboard (`/[workspaceSlug]`)

**Server Component** for initial render; **Client Components** for interactive elements.

**Renders:**
- Workspace name + header
- Grid of `BoardCard` components (one per board the user can access)
  - Board name, visibility badge (Private / Workspace), last-updated timestamp
  - Clicking a card navigates to `/[workspaceSlug]/board/[boardId]`
- "New Board" button → opens `CreateBoardDialog`
- Unread notification count in `NotificationBell` (Convex reactive query)

**Data fetching:**
- `useQuery(api.boards.listByWorkspace, { workspaceSlug })` — reactive, auto-updates when a new board is created

### 6.4 Board View (`/[workspaceSlug]/board/[boardId]`)

This is the primary product surface. It is a **Client Component** because it requires Socket.IO, dnd-kit, and continuous real-time updates.

**Renders:**
- `BoardHeader` — board name, Settings link, dark mode toggle, filter button
- `PresenceBar` — live online user avatars
- Main Kanban area — horizontal scroll container
  - One `Column` component per column, ordered by `order_index`
  - `AddColumnButton` at the far right
- Right panel (collapsible): `BoardChatPanel`
- Sliding panel (triggered by button): `ActivityLogPanel`

**On mount:**
1. Join the Socket.IO board room via `useBoardRoom(boardId)`
2. Subscribe to Convex reactive queries for columns, cards, and board metadata

**On unmount:**
1. Leave the Socket.IO board room (socket.emit('LEAVE_BOARD', { boardId }))
2. Convex subscriptions clean up automatically

### 6.5 Card Modal

Not a separate page — renders as a Dialog (shadcn/ui) over the board view. The URL does not change when a card is opened (no modal routing in v1).

**Triggered by:** Clicking any `CardItem` on the board.

**Renders two tabs (shadcn/ui Tabs):**

**Tab 1 — Details:**
- Editable title (inline input, saves on blur or Enter)
- Tiptap rich text editor for description (save button)
- Assignee picker (shadcn Popover + Command)
- Label picker (shadcn Popover, multi-select)
- Due date picker (shadcn Calendar + Popover)
- Comments thread (`CommentThread`)
- Delete card button (bottom, red, requires confirmation)

**Tab 2 — History:**
- Reverse-chronological list of every recorded change to title and description
- Each row: "[Actor name] changed [field] · [relative timestamp]"
- Read-only

**Real-time in the modal:**
- `useQuery(api.cards.get, { cardId })` — the card data auto-updates if another user edits it
- `useQuery(api.comments.listByCard, { cardId })` — comments auto-update via Convex
- If `CARD_DELETED` event is received while modal is open: close the modal and show toast "This card was deleted by another user."

### 6.6 Workspace Settings (`/[workspaceSlug]/settings`)

**Renders:**
- Members list table: name, email, role selector (Owner/Admin/Member/Guest), remove button
- Invite members section: email input → sends invite, generates invite link with copy button
- Workspace name editor
- Danger zone: "Transfer ownership", "Delete workspace" (Owner only)

**Permissions gate:** Only Owners and Admins see the member management controls. Members see a read-only list.

### 6.7 Board Settings (`/[workspaceSlug]/board/[boardId]/settings`)

**Renders:**
- Board name editor
- Visibility toggle (Private / Workspace)
- Board members table: each workspace member with their board-level permission (Edit / Comment / View / No access)
- Save button

### 6.8 Invite Acceptance Page (`/invite/[token]`)

**Renders:**
- "You've been invited to join [Workspace Name]"
- "Accept Invitation" button
- On click: calls `acceptInvite` Convex mutation with the token
- On success: redirect to workspace dashboard
- On error (expired/used): shows error message

---

## 7. Component Architecture

### 7.1 BoardView

`BoardView` is the root client component for the entire Kanban surface. It is responsible for:
- Wrapping everything in dnd-kit's `DndContext`
- Providing the `onDragEnd` handler (computes new position, fires Convex mutation + Socket.IO emit)
- Rendering the horizontal list of `Column` components
- Rendering `PresenceBar`

```
BoardView
├── BoardHeader
├── PresenceBar
├── DndContext (dnd-kit)
│   ├── SortableContext (columns)
│   │   ├── Column (×N)
│   │   │   ├── ColumnHeader (title, drag handle, delete)
│   │   │   ├── SortableContext (cards within column)
│   │   │   │   └── CardItem (×N, each draggable)
│   │   │   └── AddCardInput
│   │   └── AddColumnButton
│   └── DragOverlay (renders ghost card while dragging)
├── BoardChatPanel (right, collapsible)
└── ActivityLogPanel (sliding overlay)
```

### 7.2 Column

Each `Column`:
- Is itself a `SortableItem` (can be dragged to reorder columns)
- Has a `SortableContext` for the cards inside it
- The column header title is editable inline (click to activate)
- The delete button triggers `DeleteColumnDialog`

### 7.3 CardItem

Each `CardItem`:
- Is a `SortableItem` (can be dragged between columns and within a column)
- Renders: title, label badges (colored chips), assignee avatar (if set), due date (if set, red if overdue)
- On click: opens `CardModal` (sets a React state `openCardId`)
- Is wrapped in `useSortable` from dnd-kit

### 7.4 CardModal

A shadcn/ui `Dialog` component. Mounted once in `BoardView`, conditionally rendered based on `openCardId` state. This avoids re-mounting the modal (and its Convex subscriptions) on every card click.

```
CardModal (Dialog)
└── Tabs
    ├── Tab: Details
    │   ├── CardTitle (inline editable)
    │   ├── TiptapEditor (description)
    │   ├── AssigneePicker
    │   ├── LabelPicker
    │   ├── DueDatePicker
    │   └── CommentThread
    │       ├── CommentItem (×N)
    │       └── CommentInput (Tiptap, @mention enabled)
    └── Tab: History
        └── HistoryEntry (×N)
```

### 7.5 PresenceBar

Subscribes to presence state from `usePresence(boardId)` hook.
- Shows up to 5 avatars inline; overflow shown as "+N"
- Each avatar has a Tooltip with the user's display name
- Avatars animate in/out using Tailwind transition classes

### 7.6 BoardChatPanel

A fixed-width right panel (Tailwind: `w-80`). Collapses to a toggle button at `md` breakpoint and below.

```
BoardChatPanel
├── ChatMessageList (scrollable, newest at bottom)
│   └── ChatMessage (×N)
├── TypingIndicatorArea ("X is typing...")
└── ChatInput (plain text input, Enter to send)
```

`ChatInput` emits `TYPING_START` on first keydown (debounced), `TYPING_STOP` after 2 seconds of no input.
Messages are stored in Convex (`useQuery(api.chat.listByBoard, { boardId })`), so history loads on join.

### 7.7 ActivityLogPanel

A sliding panel (Tailwind translate-x transition) triggered by a toolbar button.

- `useQuery(api.activityLog.listByBoard, { boardId, filter })` — reactive, paginated
- Filter controls: action type dropdown + user selector dropdown
- Each entry: avatar, formatted action string (via `lib/formatActivityEntry.ts`), relative timestamp
- Clicking an entry (if it references a card): opens the card modal for that card

### 7.8 NotificationBell

In the app layout header.
- `useQuery(api.notifications.getUnreadCount, { userId })` — reactive badge count
- On click: opens a Popover with `NotificationList`
  - `useQuery(api.notifications.list, { userId })` — reactive list
  - Each `NotificationItem`: icon, message, relative time, read/unread state
  - Clicking a notification: marks it as read (Convex mutation), navigates to the relevant card

---

## 8. State Management Strategy

### Three layers of state; never mix them:

| Layer | Tool | Used For |
|---|---|---|
| Server state (persistent) | Convex reactive queries (`useQuery`) | Board data, cards, comments, notifications, activity log, chat history |
| Real-time ephemeral state | Socket.IO events + React `useState` | Presence (who is online), typing indicators, optimistic card positions during drag |
| Local UI state | React `useState` / `useReducer` | Modal open/close, filter selections, form inputs, collapse state of panels |

### 8.1 Convex as the Source of Truth

All persistent data comes from `useQuery`. Components never store a local copy of cards or columns that could go stale. When a Convex mutation fires, the reactive query automatically updates all subscribed components.

**Example:** When the user moves a card, the Convex mutation fires, and the `useQuery(api.cards.listByColumn, { columnId })` result updates for all subscribers — including the sender — without any manual state synchronization.

### 8.2 Optimistic Updates for Drag-and-Drop

Card moves must feel instant (< 16ms visual feedback) but Convex mutations have ~200-500ms network round-trip. The solution:

1. User starts dragging → dnd-kit handles visual position in real-time (no network call)
2. User drops → `useOptimisticCards` hook applies an optimistic position update to local state
3. Simultaneously: Convex `moveCard` mutation fires (network call)
4. When Convex reactive query updates with confirmed position → replaces optimistic state
5. If Convex mutation fails → revert optimistic update, snap card back, show error toast

### 8.3 Socket.IO Events → React State

Socket.IO events received from other users are handled in `useBoardRoom`. The hook listens to events and updates React state:

```
CARD_MOVED received
  → Update column/card order in local React state immediately
  → Convex reactive query will confirm shortly after

PRESENCE_UPDATE received
  → Update online users Set in usePresence hook

TYPING_START received
  → Add user to typingUsers Set in useTypingIndicator hook
  → Auto-remove after 3 seconds (timeout)

CHAT_MESSAGE received
  → Convex reactive query on chat_messages handles this automatically
  → No manual state update needed
```

### 8.4 No Redux / No Zustand

The combination of Convex reactive queries (server state) and React `useState` (local UI state) is sufficient. Adding a global state manager would create a third source of truth and increase complexity.

---

## 9. Drag-and-Drop Implementation

Built with dnd-kit. The Kanban board supports two drag types:
1. **Card drag** — between columns and within a column
2. **Column drag** — reorder columns (future-ready, implemented from start)

### 9.1 Setup

```tsx
// In BoardView.tsx
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
)
// distance: 8 prevents accidental drags when clicking a card to open the modal
```

### 9.2 Data Structures During Drag

```ts
// All cards are stored flat, keyed by column:
const cardsByColumn: Record<ColumnId, Card[]> = {
  "col-1": [card1, card2],
  "col-2": [card3],
}

// During drag, a local copy is mutated for optimistic UI.
// After Convex confirms, the reactive query replaces it.
```

### 9.3 onDragEnd Handler

```
onDragEnd({ active, over }):
  1. Identify what was dragged (card or column) from active.data
  2. Identify the drop target (column or card position) from over
  3. If card dropped on same column, same position → no-op
  4. If card dropped on different column or new position:
     a. Compute newOrderIndex via lib/orderIndex.ts gap strategy
     b. Apply optimistic UI update (move card in local state)
     c. socket.emit('CARD_MOVED', { cardId, newColumnId, newOrderIndex })
     d. await convex.moveCard({ cardId, newColumnId, newOrderIndex })
        → On error: revert optimistic update, show error toast
  5. If column dragged to new position: similar flow with column orderIndex
```

### 9.4 Order Index Gap Strategy (`lib/orderIndex.ts`)

```ts
// Cards are given orderIndex values with large gaps (1000, 2000, 3000...)
// Inserting between 2000 and 3000 → 2500
// Inserting between 2000 and 2500 → 2250
// When gap < 10: reindex all cards in that column (Convex mutation)

export function computeOrderIndex(
  prevIndex: number | null,
  nextIndex: number | null
): number {
  if (prevIndex === null && nextIndex === null) return 1000
  if (prevIndex === null) return nextIndex! / 2
  if (nextIndex === null) return prevIndex + 1000
  return (prevIndex + nextIndex) / 2
}
```

### 9.5 DragOverlay

A `DragOverlay` renders the ghost card while dragging. It renders the `CardItem` with `opacity-50` applied, so it looks like a semi-transparent card floating under the cursor.

---

## 10. Rich Text Editor Integration

Tiptap is used in two places: card descriptions and comment inputs.

### 10.1 Card Description Editor (`components/card/CardDetailsTab.tsx`)

```tsx
const editor = useEditor({
  extensions: [
    StarterKit,          // headings, bold, italic, code, lists, blockquote
    Placeholder.configure({ placeholder: 'Add a description...' }),
  ],
  content: card.description ?? null,  // JSON from Convex, or null for new cards
  editable: userCanEdit,              // Read-only for Comment/View permission users
})

// Save on blur or explicit Save button click:
const handleSave = () => {
  const json = editor.getJSON()
  updateCard({ cardId, description: json })
}

// Read mode (another user viewing the same card):
// Same editor with editable: false
// Renders JSON → formatted HTML in place
```

### 10.2 Comment Input Editor (`components/card/CommentThread.tsx`)

```tsx
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: 'Write a comment... (@mention to notify)' }),
    Mention.configure({
      HTMLAttributes: { class: 'mention' },
      suggestion: {
        items: ({ query }) =>
          workspaceMembers.filter(m =>
            m.name.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5),
        render: () => {
          // Renders the @mention dropdown using a Tippy.js popup
          // (included with Tiptap's Mention extension)
        }
      }
    }),
  ],
  editable: true,
})

// On submit (Enter key or Submit button):
const handleSubmit = () => {
  const json = editor.getJSON()
  createComment({ cardId, body: json })
  editor.commands.clearContent()
}
```

### 10.3 Mention Serialization

When a mention is inserted, the JSON content contains a mention node with the user's ID:
```json
{
  "type": "mention",
  "attrs": { "id": "user_2abc123", "label": "Punit Sharma" }
}
```

The backend scans for mention nodes in the JSON to extract the user IDs to notify (see BP.md section on comment mutations).

### 10.4 Rendering Rich Text (Read Mode)

When displaying a comment or description without editing, use `generateHTML` from Tiptap to convert the stored JSON to safe HTML:
```tsx
const html = generateHTML(bodyJson, [StarterKit, Mention])
return <div dangerouslySetInnerHTML={{ __html: html }} className="prose dark:prose-invert" />
```

The HTML is safe because it is generated by Tiptap from a known JSON schema — not from raw user-input HTML.

---

## 11. Socket.IO Client Integration

### 11.1 Socket Singleton (`lib/socket.ts`)

```ts
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
```

### 11.2 SocketProvider (`components/providers/SocketProvider.tsx`)

On auth state change:
- When user signs in → connect socket with fresh JWT
- When user signs out → disconnect and nullify socket

Provides socket instance via React context. All components access it via `useSocket()` hook.

### 11.3 useBoardRoom Hook (`hooks/useBoardRoom.ts`)

Called once in `BoardView` when the board page mounts.

**On mount:**
```ts
socket.emit('JOIN_BOARD', { boardId, token: clerkJwt })
```

**Event listeners registered:**
```
'CARD_CREATED'       → add card to local column state
'CARD_UPDATED'       → update card fields in local state
'CARD_MOVED'         → move card between columns in local state
'CARD_DELETED'       → remove card; if card modal open for this card → close modal + toast
'COLUMN_CREATED'     → add column to local state
'COLUMN_UPDATED'     → rename column in local state
'COLUMN_DELETED'     → remove column + all its cards
'PRESENCE_UPDATE'    → update online users (see usePresence)
'CHAT_MESSAGE'       → handled by Convex reactive query (no manual state needed)
'NOTIFICATION_SENT'  → trigger notification bell pulse animation
'RATE_LIMITED'       → show toast "You're sending events too quickly. Slow down."
'error'              → show toast with error message
```

**On unmount:**
```ts
socket.emit('LEAVE_BOARD', { boardId })
// Remove all event listeners to prevent memory leaks
```

### 11.4 usePresence Hook (`hooks/usePresence.ts`)

Maintains a `Map<userId, { name, avatarUrl }>` of currently online users for the board.
- Populated from `PRESENCE_UPDATE` events (join/leave)
- On `JOIN_BOARD` confirmation, server sends the full current presence list
- Returns the map for `PresenceBar` to render

### 11.5 Connection State Banner

`useBoardRoom` also tracks socket connection state (`connected`, `disconnected`, `reconnecting`).
- When disconnected: show a yellow banner at the top of the board: "You are offline. Reconnecting..."
- When reconnected: hide banner, refetch board state via Convex query

---

## 12. Convex Reactive Queries on the Frontend

These `useQuery` calls are placed in specific components. Each subscription is automatically cleaned up when the component unmounts.

| Query | Used In | Reactive Update Triggers |
|---|---|---|
| `api.boards.listByWorkspace` | WorkspaceDashboard | Board created/renamed/deleted |
| `api.columns.listByBoard` | BoardView | Column added/renamed/deleted |
| `api.cards.listByColumn` | Column | Card added/moved/updated/deleted |
| `api.cards.get` | CardModal | Card fields updated |
| `api.comments.listByCard` | CommentThread | Comment added/edited/deleted |
| `api.activityLog.listByBoard` | ActivityLogPanel | Any mutation on this board |
| `api.chat.listByBoard` | ChatPanel | Chat message sent |
| `api.notifications.list` | NotificationList | Notification created |
| `api.notifications.getUnreadCount` | NotificationBell | Notification created/read |
| `api.workspaceMembers.list` | MembersList, AssigneePicker, MentionSuggestion | Member added/removed/role changed |

---

## 13. Dark Mode

### Implementation

Uses `next-themes` library with Tailwind's `class` strategy.

**tailwind.config.ts:**
```ts
darkMode: 'class'
```

**ThemeProvider** wraps the app and manages the `dark` class on `<html>`.

**Toggle button** (in `BoardHeader` and `UserMenu`):
```tsx
const { theme, setTheme } = useTheme()
<Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
</Button>
```

**Persistence:** `next-themes` stores the selection in `localStorage` and applies it on the next page load before first paint (no flash of incorrect theme).

**All components** use Tailwind's `dark:` prefix for dark mode variants:
```tsx
className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
```

shadcn/ui components automatically support dark mode because they use Tailwind variables (`bg-background`, `text-foreground`) that are defined differently in light and dark modes via CSS custom properties.

---

## 14. Mobile Responsiveness

### Strategy

All responsive behavior is implemented with Tailwind breakpoint prefixes. No JavaScript-based responsive logic.

### Board View on Mobile

The Kanban board is a horizontally scrollable layout on desktop. On mobile (`sm` breakpoint and below):
- The column list becomes a tab-bar navigation (one column per tab)
- Only one column is visible at a time
- Tab navigation is rendered above the cards
- Horizontal scrolling within a column is preserved

```tsx
// Column container: hidden on mobile, shown on desktop
<div className="hidden md:flex flex-row gap-4 overflow-x-auto h-full">
  {columns.map(col => <Column key={col._id} column={col} />)}
</div>

// Mobile column tabs: shown only on mobile
<div className="flex md:hidden flex-col h-full">
  <ColumnTabs columns={columns} />
  <Column column={activeColumn} />
</div>
```

### Card Modal on Mobile

- The Dialog takes full screen on mobile (`sm:max-w-full h-full rounded-none`)
- Tabs scroll vertically
- Comment input is fixed to the bottom of the screen (sticky bottom)

### Sidebar on Mobile

- The `AppSidebar` collapses to a hamburger menu on mobile
- Opens as a slide-over panel from the left
- Uses shadcn/ui Sheet component

### Chat Panel on Mobile

- Collapses to a floating action button (chat icon) on mobile
- Tapping opens the chat as a bottom sheet (full-width, half-height)

---

## 15. Edge Case Handling in the UI

All edge cases from PRD section 9 have a corresponding UI behavior:

### 15.1 Concurrent Card Edits (PRD 9.1)

The Convex reactive query on `api.cards.get` will push the final server value to the card modal after a concurrent edit. If the user currently has unsaved changes in the description editor, the editor content is NOT overwritten mid-edit — the Convex update only affects the card title display in the header. A subtle "Updated by [name]" message appears.

### 15.2 Concurrent Card Ordering (PRD 9.2)

After a card move, if the server sends back a corrected order (via `CARD_MOVED` event or Convex query update), the board re-renders with the authoritative order. No special UI is needed — dnd-kit re-renders from the current card data.

### 15.3 WebSocket Disconnection (PRD 9.3)

`useBoardRoom` monitors socket connection state. When disconnected:
- Yellow banner: "You are offline. Changes may not sync until you reconnect."
- Drag-and-drop is disabled (DndContext receives `disabled: !isConnected` prop)
- On reconnect: banner disappears, `useQuery` data is already fresh (Convex reconnects independently)

### 15.4 Column Deletion with Cards (PRD 9.4)

`DeleteColumnDialog` is a shadcn `AlertDialog` (not a regular Dialog — requires explicit keyboard interaction to confirm).

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Column</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Delete "{column.title}"?</AlertDialogTitle>
    <AlertDialogDescription>
      This column contains {cardCount} cards. Deleting it will permanently
      delete all cards inside. This cannot be undone.
    </AlertDialogDescription>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
    <AlertDialogAction onClick={handleDelete}>Delete Column</AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

### 15.5 Unauthorized Action Attempt (PRD 9.5)

Two-layer defense:
1. **UI layer:** Controls are hidden/disabled based on the user's permission level (via `lib/permissions.ts`). A view-only user does not see drag handles on cards.
2. **Server layer:** Even if the UI is bypassed, the Convex mutation or Socket.IO server rejects the action. On rejection, the card snaps back to its original position and a toast appears: "You don't have permission to edit this board."

```ts
// lib/permissions.ts
export function canEdit(role: BoardPermission): boolean {
  return role === 'edit'
}
export function canComment(role: BoardPermission): boolean {
  return role === 'edit' || role === 'comment'
}
```

### 15.6 Invalid Invite Link (PRD 9.6)

`/invite/[token]` page calls `acceptInvite` mutation. On `ConvexError` with code `INVITE_EXPIRED` or `INVITE_USED`, renders:
```tsx
<div>This invite link is no longer valid. Ask the workspace owner for a new one.</div>
```

### 15.7 Duplicate Workspace Slug (PRD 9.7)

The backend auto-generates a unique slug. The frontend shows the final URL to the user after workspace creation (in a "Workspace created" success state), so they can see if it was adjusted.

### 15.8 @Mention of a Non-Member (PRD 9.8)

Tiptap's Mention suggestion `items` function only returns workspace members. If the query matches no member, the dropdown shows "No members found" and no mention node is created. Plain text is submitted as-is.

### 15.9 Deleted Card Open in Another User's Session (PRD 9.10)

In `useBoardRoom`, on receiving `CARD_DELETED`:
```ts
if (openCardId === deletedCardId) {
  setOpenCardId(null)  // close the modal
  toast.error('This card was deleted by another user.')
}
```

---

## 16. Page-by-Page Implementation Checklist

### Authentication
- [ ] Sign-in page with Clerk embed
- [ ] Sign-up page with Clerk embed
- [ ] Middleware protecting all `(app)` routes
- [ ] First-login redirect to `/onboarding`

### Onboarding
- [ ] Create workspace form (name → slug → navigate)
- [ ] Join workspace form (paste invite link → navigate)
- [ ] Skip if user already has a workspace

### Workspace Dashboard
- [ ] Board grid with `BoardCard` components
- [ ] "New Board" dialog (name + visibility)
- [ ] Unread notification badge
- [ ] Workspace sidebar with workspace switcher

### Board View
- [ ] DndContext wrapping the board
- [ ] Column rendering with SortableContext
- [ ] Card rendering with useSortable
- [ ] DragOverlay ghost card
- [ ] PresenceBar with live avatars
- [ ] Add Column button + inline input
- [ ] Add Card inline input at bottom of each column
- [ ] Board chat panel (collapsible)
- [ ] Activity log panel (sliding)
- [ ] Connection state banner

### Card Modal
- [ ] Details tab: all 5 card fields editable
- [ ] Tiptap description editor (edit + read modes)
- [ ] Assignee picker (Popover + Command)
- [ ] Label picker (Popover, multi-select)
- [ ] Due date picker (Calendar)
- [ ] Comment thread with real-time updates
- [ ] @mention in comment input
- [ ] History tab with field change log
- [ ] Delete card with confirmation

### Columns
- [ ] Inline rename (click title to edit)
- [ ] Delete column dialog with card count warning
- [ ] Column drag-to-reorder

### Real-Time
- [ ] Socket.IO connection with Clerk JWT
- [ ] Board room join/leave
- [ ] All 8 board events handled in useBoardRoom
- [ ] Presence bar live update
- [ ] Typing indicator in chat
- [ ] Offline banner + reconnect

### Workspace Settings
- [ ] Member list with role selector
- [ ] Email invite + invite link generation
- [ ] Remove member action
- [ ] Transfer ownership action

### Board Settings
- [ ] Rename board
- [ ] Change visibility
- [ ] Per-member permission selector

### Notifications
- [ ] Bell icon with badge count
- [ ] Notification dropdown list
- [ ] Mark as read on click + navigate to card

### Theme & Responsive
- [ ] Dark mode toggle (persists in localStorage)
- [ ] Mobile column tab navigation
- [ ] Mobile sidebar hamburger
- [ ] Mobile chat bottom sheet
- [ ] Full-screen card modal on mobile
