# API Integration Plan: OnPoint

**Version 1.0 | March 2026**
**References:** BP.md (backend architecture) · FP.md (frontend integration) · SECURITY_AND_OPERATIONS.md

---

## Purpose

This document defines the exact integration contracts for every external service OnPoint uses. It answers: what data flows between OnPoint and each service, what can go wrong, and exactly how to handle each failure case.

Claude must reference this document when writing any code that touches Clerk, Convex, Socket.IO, or Upstash Redis.

---

## Table of Contents

1. [Service Overview](#1-service-overview)
2. [Clerk — Authentication Service](#2-clerk--authentication-service)
3. [Convex — Database & Backend Logic](#3-convex--database--backend-logic)
4. [Socket.IO — Real-Time Event Server](#4-socketio--real-time-event-server)
5. [Upstash Redis — Pub/Sub & Rate Limiting](#5-upstash-redis--pubsub--rate-limiting)
6. [Complete Socket.IO Event Catalog](#6-complete-socketio-event-catalog)
7. [Error Handling Reference](#7-error-handling-reference)
8. [Service Interaction Map](#8-service-interaction-map)

---

## 1. Service Overview

| Service | Role | Who Calls It |
|---|---|---|
| Clerk | Issues JWTs, manages auth sessions, syncs user events via webhooks | Frontend (sign-in/up), Socket.IO server (verify JWTs), Convex (verify JWTs via JWKS) |
| Convex | Persistent data layer — all reads and writes | Frontend (useQuery, useMutation), Socket.IO does NOT call Convex |
| Socket.IO Server | Ephemeral real-time events — broadcasts only | Frontend (socket.emit/on) |
| Upstash Redis | Socket.IO pub/sub adapter + rate limiting counters | Socket.IO server only |

**Key rule: The Socket.IO server never writes to Convex.** It is a pure broadcast relay. The frontend is responsible for calling both Convex (persist) and Socket.IO (broadcast) for every state-changing action.

---

## 2. Clerk — Authentication Service

### 2.1 What Clerk Provides

- User registration and sign-in (email/password + Google OAuth)
- Session management (JWTs refreshed automatically by the Clerk SDK)
- Webhook events when user records change (`user.created`, `user.updated`)
- A publishable key (safe for frontend) and secret key (server-only)

### 2.2 JWT Structure

When a user is authenticated, Clerk issues a JWT. This token is used to authenticate requests to both Convex and the Socket.IO server.

**JWT Claims (relevant fields):**

```json
{
  "sub": "user_2abc123def456",     // Clerk user ID — used as clerkId in Convex
  "iss": "https://clerk.your-app.com",  // Issuer URL — verified by Convex and Socket.IO
  "aud": "convex",                 // Audience — set in Clerk dashboard JWT template
  "iat": 1711900000,               // Issued at (Unix timestamp)
  "exp": 1711903600,               // Expiry (1 hour from issue)
  "email": "user@example.com",
  "name": "Alice Smith",
  "picture": "https://..."         // Avatar URL (from Google or Clerk-hosted)
}
```

**Important:** The `sub` field is the Clerk user ID. This is stored as `clerkId` in the Convex `users` table and is how OnPoint links Clerk identities to application user records.

### 2.3 Getting the JWT on the Frontend

```tsx
// Inside any client component using Clerk:
import { useAuth } from '@clerk/nextjs'

const { getToken } = useAuth()

// Get a short-lived JWT (refreshed automatically):
const token = await getToken()  // returns string | null

// Get a token for a specific audience (required for Convex):
const convexToken = await getToken({ template: 'convex' })

// For Socket.IO: use the default token (no template needed)
const socketToken = await getToken()
```

**When `getToken()` returns null:** The user is not signed in or the session has expired. Redirect to `/sign-in`.

### 2.4 Convex — Clerk Integration

Convex verifies Clerk JWTs using Clerk's JWKS endpoint (configured once in the Convex dashboard). No code is needed in Convex functions for this — Convex handles JWT verification automatically when you call `ctx.auth.getUserIdentity()`.

**Setup (one-time, in Convex dashboard):**
- Auth → Add provider → Clerk
- Enter your Clerk issuer URL: `https://clerk.your-app.com` (from Clerk dashboard → API Keys → Issuer URL)

**In Convex functions:**
```ts
// ctx.auth.getUserIdentity() returns:
{
  subject: "user_2abc123def456",   // Clerk user ID
  issuer: "https://...",
  email: "user@example.com",
  name: "Alice Smith",
  pictureUrl: "https://...",
  // ... other JWT claims
}
```

### 2.5 Socket.IO Server — Clerk Integration

The Socket.IO server verifies Clerk JWTs using `@clerk/backend`'s `verifyToken` function.

```ts
// server/src/middleware/auth.ts
import { verifyToken } from '@clerk/backend'

const payload = await verifyToken(token, {
  secretKey: process.env.CLERK_SECRET_KEY,
})
// payload.sub → Clerk user ID
// payload.name → user display name
```

**`verifyToken` makes a network call to Clerk's JWKS endpoint on the first call, then caches the public keys.** This means the first connection after a server restart is slightly slower. Subsequent connections use the cache.

### 2.6 Webhook Events

Clerk sends HTTP POST requests to `POST /api/webhooks/clerk` when user events occur.

**Event: `user.created`**

```json
{
  "type": "user.created",
  "data": {
    "id": "user_2abc123def456",
    "email_addresses": [{ "email_address": "user@example.com" }],
    "first_name": "Alice",
    "last_name": "Smith",
    "image_url": "https://..."
  }
}
```

Action: Call `createUser` internal Convex mutation with `clerkId`, `email`, `name`, `avatarUrl`.

**Event: `user.updated`**

```json
{
  "type": "user.updated",
  "data": {
    "id": "user_2abc123def456",
    "first_name": "Alice",
    "last_name": "Smith Updated",
    "image_url": "https://..."
  }
}
```

Action: Call `updateUser` Convex mutation to sync the name and avatar.

**Webhook Signature Verification:**

```ts
import { Webhook } from 'svix'

const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
const evt = wh.verify(rawBody, {
  'svix-id': req.headers['svix-id'],
  'svix-timestamp': req.headers['svix-timestamp'],
  'svix-signature': req.headers['svix-signature'],
})
```

If `wh.verify()` throws: return `400 Bad Request`. Do not process the event.

### 2.7 Clerk Error Handling

| Error | When | Handling |
|---|---|---|
| `null` from `getToken()` | Session expired or user signed out | Redirect to `/sign-in` |
| `verifyToken` throws | Invalid or expired JWT in Socket.IO auth | Return `next(new Error('INVALID_TOKEN'))` to reject connection |
| Webhook signature mismatch | Tampered request | Return `400`, log (without the body content) |
| Webhook event `user.created` for existing `clerkId` | Replay attack or duplicate delivery | Check for existing user first, skip if already exists |

### 2.8 Clerk Free Tier Limits

- Up to 10,000 Monthly Active Users (MAU) — more than sufficient for v1
- No limit on webhook events
- OAuth with Google: included on free tier

---

## 3. Convex — Database & Backend Logic

### 3.1 What Convex Provides

- A serverless document database with TypeScript-defined schema
- Server-side functions: `query` (read, reactive), `mutation` (write, transactional), `internalMutation` (server-only write)
- Live subscriptions: `useQuery()` re-runs automatically when underlying data changes
- A dashboard for testing functions and inspecting data

### 3.2 Query Patterns

```tsx
// Reactive query — re-renders the component whenever data changes
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

const cards = useQuery(api.cards.listByBoard, { boardId })
// cards is:
//   undefined — loading (first render)
//   null — query threw an error
//   Doc<'cards'>[] — loaded data (updates automatically)
```

**Loading state handling:**
```tsx
if (cards === undefined) return <BoardSkeleton />
if (cards === null) return <ErrorState message="Failed to load cards" />
return <BoardView cards={cards} />
```

**Never render `cards?.map(...)` without handling the `undefined` case.** `undefined` means "loading" — rendering nothing during load creates layout shift.

### 3.3 Mutation Patterns

```tsx
// One-time write — does not update automatically
import { useMutation } from 'convex/react'

const moveCard = useMutation(api.cards.moveCard)

// Call in an event handler:
try {
  await moveCard({ cardId, newColumnId, newOrderIndex })
  // success — Convex reactive queries auto-update
} catch (error) {
  if (error instanceof ConvexError) {
    const { code } = error.data
    if (code === 'FORBIDDEN') showToast('You don\'t have permission to do that.')
    if (code === 'UNAUTHENTICATED') router.push('/sign-in')
  } else {
    showToast('Something went wrong. Please try again.')
  }
  // revert any optimistic update
}
```

### 3.4 ConvexError Codes

All business logic errors thrown from Convex mutations use `ConvexError` with a `code` field. These are the codes OnPoint uses:

| Code | Meaning | Where Thrown | Frontend Action |
|---|---|---|---|
| `UNAUTHENTICATED` | No valid JWT / user not found in DB | `requireUser()` | Redirect to `/sign-in` |
| `FORBIDDEN` | Insufficient board or workspace permission | `assertBoardPermission`, `assertWorkspaceRole` | Show toast, revert optimistic update |
| `NOT_FOUND` | Entity does not exist (card, board, etc.) | Any `ctx.db.get()` that returns null | Show error state, close modal |
| `INVITE_EXPIRED` | Invite token is expired or already used | `acceptInvite` | Show "invite expired" error page |
| `INVITE_USED` | Invite already accepted | `acceptInvite` | Show "invite expired" error page |
| `DUPLICATE_SLUG` | Should not occur (slug suffix logic prevents) | `createWorkspace` (fallback) | Prompt user to choose a different name |
| `USER_NOT_FOUND` | Clerk JWT valid but no Convex user record yet | `requireUser()` | Wait and retry — may be a race condition with the webhook |

**Catching ConvexError on the frontend:**
```ts
import { ConvexError } from 'convex/values'

try {
  await mutation(args)
} catch (err) {
  if (err instanceof ConvexError) {
    const code = (err.data as { code: string }).code
    // handle by code
  }
}
```

### 3.5 Optimistic Updates

Convex does not have a built-in optimistic update API (unlike React Query). OnPoint implements optimistic updates manually:

```tsx
// Pattern:
const [localCards, setLocalCards] = useState<Card[]>([])
const serverCards = useQuery(api.cards.listByBoard, { boardId })

// On mount and whenever server data changes, sync local state
useEffect(() => {
  if (serverCards) setLocalCards(serverCards)
}, [serverCards])

// On drag end:
const originalCards = localCards
setLocalCards(applyMove(localCards, drag))  // optimistic

try {
  await moveCard(...)  // persist
} catch {
  setLocalCards(originalCards)  // revert on failure
}
```

The `useOptimisticCards` hook in `hooks/useOptimisticCards.ts` encapsulates this pattern.

### 3.6 Convex Rate Limits (Free Tier)

| Resource | Free Limit | OnPoint Usage |
|---|---|---|
| Function calls | 1,000,000 per month | Comfortably within limit for a small team tool |
| Database reads | 1,000,000 per month | Same |
| Database writes | 500,000 per month | Same |
| Storage | 512 MB | Well within limit (text content, no files in v1) |
| Bandwidth | 1 GB per month | Same |

If limits are approached: Convex dashboard shows usage. Free tier is sufficient for demo/portfolio use.

### 3.7 Convex Pagination

Activity log uses Convex pagination:

```ts
// In the query:
const results = await ctx.db
  .query('activityLogs')
  .withIndex('by_board', q => q.eq('boardId', boardId))
  .order('desc')
  .paginate({ numItems: 20, cursor: args.cursor ?? null })

return results
// results.page → array of entries for this page
// results.continueCursor → pass as cursor for the next page
// results.isDone → true if no more pages
```

```tsx
// On the frontend:
const [cursor, setCursor] = useState<string | null>(null)
const [entries, setEntries] = useState<ActivityEntry[]>([])

const result = useQuery(api.activityLogs.listByBoard, { boardId, cursor })

useEffect(() => {
  if (result?.page) {
    setEntries(prev => cursor ? [...prev, ...result.page] : result.page)
  }
}, [result])

// "Load more" button:
<Button onClick={() => setCursor(result.continueCursor)}>Load more</Button>
// Hide button when result.isDone is true
```

---

## 4. Socket.IO — Real-Time Event Server

### 4.1 What Socket.IO Provides

- Low-latency WebSocket connections (falls back to HTTP long-polling if WebSockets are blocked)
- Room-based broadcasting: events are sent to all sockets in a named room
- Authentication middleware: validates JWTs before accepting connections
- Rate limiting via Redis (see section 5)

**What Socket.IO does NOT do:** It does not write to any database. It does not own any state. If the Socket.IO server restarts, no data is lost — all state is in Convex.

### 4.2 Client Connection

```ts
// lib/socket.ts
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token },        // JWT sent in handshake
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
```

**Always call `socket.connect()` explicitly after `getSocket()`.** Setting `autoConnect: false` gives us control over when the connection opens.

### 4.3 Connection Lifecycle

```
Client                           Socket.IO Server
  │                                    │
  │── socket.connect() ──────────────>│
  │                                    │ auth middleware runs
  │                                    │ verifyToken(token) → payload
  │                                    │ socket.data.userId = payload.sub
  │<── connect event ─────────────────│
  │                                    │
  │── JOIN_BOARD { boardId } ─────────>│
  │                                    │ socket.join(boardId)
  │                                    │ addToPresence(boardId, userId)
  │<── PRESENCE_INIT { users } ────────│  (sent to this socket only)
  │                                    │
  │                                    │── PRESENCE_UPDATE { type: 'JOIN', ... } ──> (all others in room)
  │                                    │
  │  [actions happen here]             │
  │                                    │
  │── LEAVE_BOARD { boardId } ────────>│
  │                                    │ socket.leave(boardId)
  │                                    │ removeFromPresence(boardId, userId)
  │                                    │── PRESENCE_UPDATE { type: 'LEAVE', userId } ──> (all others)
  │                                    │
  │── socket.disconnect() ────────────>│
  │                                    │ 'disconnect' event fires automatically
  │                                    │ removeFromPresence for all rooms
```

### 4.4 Authentication Failure Handling

```tsx
// SocketProvider.tsx
socket.on('connect_error', (error) => {
  if (error.message === 'INVALID_TOKEN') {
    // Token expired — refresh and reconnect
    getToken().then(newToken => {
      if (newToken) {
        socket.auth = { token: newToken }
        socket.connect()
      } else {
        // Session ended — redirect to sign-in
        router.push('/sign-in')
      }
    })
  }
})
```

### 4.5 Reconnection Strategy

Socket.IO's built-in reconnection is configured with:
- `reconnectionAttempts: 5` — give up after 5 failed attempts
- `reconnectionDelay: 1000` — start with 1 second delay
- `reconnectionDelayMax: 5000` — cap at 5 seconds (exponential backoff)

On successful reconnection:
```ts
socket.on('reconnect', () => {
  // Re-join the current board room
  socket.emit('JOIN_BOARD', { boardId: currentBoardId })
  // The PRESENCE_INIT response re-establishes presence state
})
```

On giving up (5 attempts exhausted):
```ts
socket.on('reconnect_failed', () => {
  // Show a persistent offline banner with a "Retry" button
  // Retry: socket.connect()
})
```

---

## 5. Upstash Redis — Pub/Sub & Rate Limiting

### 5.1 What Upstash Redis Provides

- Pub/Sub for Socket.IO multi-instance broadcasting (via `@socket.io/redis-adapter`)
- Key-value store for rate limit counters

**In v1 on Render's free tier, there is only one Socket.IO instance.** Redis pub/sub is not strictly necessary for single-instance deployments. However, it is set up from the beginning so that scaling to multiple instances requires no code changes.

### 5.2 Connection Configuration

```ts
// server/src/redis.ts
import { Redis } from 'ioredis'
import { createAdapter } from '@socket.io/redis-adapter'

export async function setupRedisAdapter(io: Server) {
  const pubClient = new Redis(process.env.UPSTASH_REDIS_URL!, {
    tls: { rejectUnauthorized: false },  // Required for Upstash TLS connections
  })
  const subClient = pubClient.duplicate()

  pubClient.on('error', (err) => console.error('[Redis pub error]', err.message))
  subClient.on('error', (err) => console.error('[Redis sub error]', err.message))

  io.adapter(createAdapter(pubClient, subClient))
  console.log('[Redis] Adapter connected')
}
```

**Important:** Upstash Redis URLs start with `rediss://` (double 's') for TLS. The `tls: { rejectUnauthorized: false }` option is required for the Upstash TLS certificate chain.

### 5.3 Rate Limiting Implementation

```ts
// server/src/rateLimit.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  tls: { rejectUnauthorized: false },
})

const LIMIT = 30         // max events
const WINDOW_SECONDS = 10  // per 10 seconds

export async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, WINDOW_SECONDS)
  }
  return current <= LIMIT
}
```

Usage in event handlers:
```ts
socket.on('CARD_MOVED', async (data) => {
  const allowed = await checkRateLimit(socket.data.userId)
  if (!allowed) {
    socket.emit('RATE_LIMITED', { message: 'Too many events. Slow down.' })
    return
  }
  socket.to(data.boardId).emit('CARD_MOVED', data)
})
```

### 5.4 Upstash Free Tier Limits

| Resource | Free Limit | OnPoint Usage |
|---|---|---|
| Commands per day | 10,000 | Rate limit check = 1 command/event; pub/sub overhead ≈ 2–3 commands/event. A team of 5 doing 100 events/day = ~300 commands. Well within limit. |
| Storage | 256 MB | Rate limit keys are tiny (< 100 bytes each). No storage concern. |
| Connections | Unlimited | N/A |

### 5.5 Redis Failure Handling

If Redis is unavailable:
- The Socket.IO adapter will fail to publish events to other instances — but with a single instance (Render free tier), this only matters at scale
- Rate limiting will fail open (allow the event) if Redis is down — acceptable for v1
- Log the Redis error to console, do not crash the server

```ts
// Defensive rate limit check:
export async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const key = `ratelimit:${userId}`
    const current = await redis.incr(key)
    if (current === 1) await redis.expire(key, WINDOW_SECONDS)
    return current <= LIMIT
  } catch (err) {
    console.error('[Rate limit check failed — allowing event]', err)
    return true  // fail open
  }
}
```

---

## 6. Complete Socket.IO Event Catalog

This is the authoritative list of every Socket.IO event in the system. No event name, direction, or payload should deviate from this catalog.

### 6.1 Direction Legend

- `C → S` — Client emits to Server
- `S → C` — Server emits to Client(s)
- `S → room (excl. sender)` — Server broadcasts to all room members except the emitting client
- `S → C (self only)` — Server emits only to the triggering client

### 6.2 Connection Events (Built-In)

| Event | Direction | Payload | Description |
|---|---|---|---|
| `connect` | S → C | none | Connection established |
| `connect_error` | S → C | `{ message: string }` | Connection rejected (e.g., `INVALID_TOKEN`) |
| `disconnect` | S → C | `reason: string` | Connection lost |
| `reconnect` | S → C | `attemptNumber: number` | Reconnection succeeded |
| `reconnect_failed` | S → C | none | All reconnection attempts exhausted |

### 6.3 Board Room Events

#### JOIN_BOARD
```ts
// C → S
{ boardId: string }

// Server actions:
// 1. socket.join(boardId)
// 2. addToPresence(boardId, socket.data.userId, { name, avatarUrl })
// 3. Emit PRESENCE_INIT to this socket (self only)
// 4. Broadcast PRESENCE_UPDATE (type: JOIN) to room (excluding this socket)
```

#### LEAVE_BOARD
```ts
// C → S
{ boardId: string }

// Server actions:
// 1. socket.leave(boardId)
// 2. removeFromPresence(boardId, socket.data.userId)
// 3. Broadcast PRESENCE_UPDATE (type: LEAVE) to room
```

#### PRESENCE_INIT
```ts
// S → C (self only — sent immediately after JOIN_BOARD)
{
  boardId: string
  users: Array<{
    userId: string
    name: string
    avatarUrl: string | null
  }>
}
// The full list of currently online users for this board
```

#### PRESENCE_UPDATE
```ts
// S → room (excl. sender)
{
  boardId: string
  type: 'JOIN' | 'LEAVE'
  userId: string
  name: string        // included in JOIN, omitted in LEAVE
  avatarUrl: string | null  // included in JOIN
}
```

### 6.4 Card Events

#### CARD_CREATED
```ts
// C → S (emit after calling Convex createCard mutation)
{
  boardId: string
  card: {
    _id: string
    columnId: string
    title: string
    orderIndex: number
  }
}

// Server: checkRateLimit → broadcast to room (excl. sender)
// S → room (excl. sender): same payload
```

#### CARD_UPDATED
```ts
// C → S (emit after calling Convex updateCard mutation)
{
  boardId: string
  cardId: string
  changes: {
    title?: string
    description?: unknown  // Tiptap JSON
    assigneeId?: string | null
    dueDate?: string | null
    labels?: string[]
  }
}

// Server: checkRateLimit → broadcast to room (excl. sender)
```

#### CARD_MOVED
```ts
// C → S (emit after calling Convex moveCard mutation)
{
  boardId: string
  cardId: string
  newColumnId: string
  newOrderIndex: number
}

// Server: checkRateLimit → broadcast to room (excl. sender)
```

#### CARD_DELETED
```ts
// C → S (emit after calling Convex deleteCard mutation)
{
  boardId: string
  cardId: string
}

// Server: checkRateLimit → broadcast to room (excl. sender)
```

### 6.5 Column Events

#### COLUMN_CREATED
```ts
// C → S (emit after calling Convex createColumn mutation)
{
  boardId: string
  column: {
    _id: string
    title: string
    orderIndex: number
  }
}

// Server: checkRateLimit → broadcast to room (excl. sender)
```

#### COLUMN_UPDATED
```ts
// C → S (emit after calling Convex updateColumn mutation)
{
  boardId: string
  columnId: string
  title: string
}

// Server: checkRateLimit → broadcast to room (excl. sender)
```

#### COLUMN_DELETED
```ts
// C → S (emit after calling Convex deleteColumn mutation)
{
  boardId: string
  columnId: string
}

// Server: checkRateLimit → broadcast to room (excl. sender)
```

### 6.6 Chat Events

#### CHAT_MESSAGE_SENT
```ts
// C → S (emit after calling Convex sendChatMessage mutation)
// Note: the actual message content is NOT sent via socket — it is fetched via Convex reactive query
// The socket event is just a signal: "a new chat message was saved, go fetch it"
{
  boardId: string
  messageId: string  // the Convex _id of the newly created message
}

// Server: checkRateLimit → broadcast to room (excl. sender)
// Receivers: their Convex useQuery(api.chat.listByBoard) will auto-update reactively
// But the socket signal makes it feel instant (triggers re-render sooner)
```

**Design note:** Chat messages are stored in Convex and delivered via Convex reactive queries. The Socket.IO `CHAT_MESSAGE_SENT` event is optional — Convex will deliver the message anyway. The socket event just accelerates the perceived delivery time.

### 6.7 Typing Indicator Events

#### TYPING_START
```ts
// C → S
{
  boardId: string
  userName: string  // display name — not userId (used for UI display only)
}

// Server: checkRateLimit → broadcast to room (excl. sender)
```

#### TYPING_STOP
```ts
// C → S
{
  boardId: string
  userName: string
}

// Server: broadcast to room (excl. sender) — no rate limit needed (infrequent)
```

### 6.8 Server-to-Client Error Events

#### RATE_LIMITED
```ts
// S → C (self only — sent to the socket that exceeded the rate limit)
{
  message: string  // "Too many events. Please slow down."
}

// Frontend action: show a warning toast
```

#### error (Socket.IO built-in)
```ts
// S → C (errors from the server event handlers)
{ message: string }

// Frontend action: log to console, show toast if user-facing
```

### 6.9 Events NOT Handled by Socket.IO

These are **NOT** socket events — they are handled exclusively by Convex reactive queries:

| What | How It Delivers |
|---|---|
| New comment | `useQuery(api.comments.listByCard)` auto-updates |
| New notification | `useQuery(api.notifications.list)` auto-updates |
| Unread count change | `useQuery(api.notifications.getUnreadCount)` auto-updates |
| Card history entries | `useQuery(api.cards.getHistory)` auto-updates |
| Activity log new entries | `useQuery(api.activityLogs.listByBoard)` auto-updates |
| Board settings changes | `useQuery(api.boards.get)` auto-updates |

---

## 7. Error Handling Reference

### 7.1 Frontend Error Handling Strategy

| Error Type | Source | Frontend Action |
|---|---|---|
| `ConvexError { code: 'UNAUTHENTICATED' }` | Convex mutation | Redirect to `/sign-in` |
| `ConvexError { code: 'FORBIDDEN' }` | Convex mutation | Toast + revert optimistic update |
| `ConvexError { code: 'NOT_FOUND' }` | Convex mutation/query | Show 404 state or close modal |
| `ConvexError { code: 'INVITE_EXPIRED' }` | `acceptInvite` | Show invite expired page |
| Network error (Convex unreachable) | `useMutation` | Toast: "Connection lost. Try again." |
| `connect_error: INVALID_TOKEN` | Socket.IO connection | Refresh token and reconnect |
| `reconnect_failed` | Socket.IO connection | Show persistent offline banner with retry button |
| `RATE_LIMITED` socket event | Socket.IO server | Toast: "You're sending too many events. Please slow down." |
| `useQuery` returns `undefined` | Convex (loading) | Show skeleton state |
| `useQuery` returns `null` | Convex (error) | Show error state |

### 7.2 Server-Side Error Handling Strategy

**Convex mutations — throw ConvexError, never return error objects:**
```ts
// Correct:
throw new ConvexError({ code: 'FORBIDDEN', message: 'Insufficient permission' })

// Wrong — this looks like success to the client:
return { error: 'FORBIDDEN' }
```

**Socket.IO event handlers — catch all errors, never let the server crash:**
```ts
socket.on('CARD_MOVED', async (data) => {
  try {
    const allowed = await checkRateLimit(socket.data.userId)
    if (!allowed) {
      socket.emit('RATE_LIMITED', { message: 'Too many events. Slow down.' })
      return
    }
    socket.to(data.boardId).emit('CARD_MOVED', { ...data, userId: socket.data.userId })
  } catch (err) {
    console.error('[CARD_MOVED handler error]', err)
    socket.emit('error', { message: 'Failed to broadcast event' })
    // Do not re-throw — never crash the Socket.IO server
  }
})
```

### 7.3 Race Condition: User Signs Up but Webhook Is Delayed

**Problem:** A user signs up via Clerk. The frontend redirects them to `/onboarding`. They arrive at `/onboarding` and the page calls `listMyWorkspaces` — but the Clerk webhook hasn't fired yet, so there is no user record in Convex yet. `requireUser()` throws `USER_NOT_FOUND`.

**Handling:**
```tsx
// In onboarding page:
const user = useQuery(api.users.getMe)

// user === undefined: loading
// user === null: USER_NOT_FOUND — webhook not delivered yet
// user !== null: user record exists

if (user === null) {
  // Show a loading spinner for a few seconds
  // The Clerk webhook typically delivers within 1-2 seconds
  return <div>Setting up your account...</div>
}
```

The webhook typically delivers within 1–2 seconds. A brief loading spinner handles this case gracefully.

---

## 8. Service Interaction Map

This diagram shows every integration point between OnPoint's services:

```
USER BROWSER
│
├── Clerk SDK (frontend)
│   ├── Sign-in / Sign-up flow → Clerk.com
│   ├── getToken() → JWT for Convex
│   └── getToken() → JWT for Socket.IO
│
├── Next.js App (Vercel)
│   ├── useQuery(api.xxx) ──────────────→ Convex (reads, reactive)
│   ├── useMutation(api.xxx) ───────────→ Convex (writes)
│   ├── socket.emit(EVENT) ─────────────→ Socket.IO Server (Render)
│   └── socket.on(EVENT) ←──────────────  Socket.IO Server (Render)
│
│   [Server-side]
│   └── POST /api/webhooks/clerk ←──────  Clerk (user.created / user.updated)
│       └── fetchMutation(createUser) ──→ Convex (internalMutation)
│
CONVEX
│   ├── Verifies Clerk JWT via JWKS
│   ├── Executes queries and mutations
│   └── Pushes real-time updates to all useQuery subscribers
│
SOCKET.IO SERVER (Render)
│   ├── Verifies Clerk JWT via @clerk/backend verifyToken
│   ├── Manages board rooms (in-memory)
│   ├── Broadcasts events to room members
│   └── Checks/writes rate limit counters ──→ Upstash Redis
│
UPSTASH REDIS
│   ├── Rate limit counters for Socket.IO events
│   └── Pub/Sub adapter for Socket.IO multi-instance broadcasting
│
CLERK.COM (External)
│   ├── Issues and verifies JWTs
│   ├── Manages OAuth (Google)
│   ├── Exposes JWKS endpoint for Convex and Socket.IO server
│   └── Sends webhooks to Next.js API route
```

### 8.1 Data Flow for Card Move (Complete)

This is the most complex action in OnPoint — it touches all 3 services:

```
1. User drags card to new column
   │
2. onDragEnd fires in BoardView.tsx
   │
3. computeOrderIndex(prev, next) → newOrderIndex
   │
4. [OPTIMISTIC] setLocalCards(applyMove(...))  ← instant UI update
   │
5. await moveCard({ cardId, newColumnId, newOrderIndex })  ← Convex write
   │  [Server: requireUser → assertBoardPermission(edit) → validate destination column
   │   → ctx.db.patch card → writeActivityLog → return success]
   │
6. socket.emit('CARD_MOVED', { boardId, cardId, newColumnId, newOrderIndex })
   │  [Server: checkRateLimit → socket.to(boardId).emit('CARD_MOVED', ...)]
   │
7. Other users' useBoardRoom listeners receive CARD_MOVED
   │  → their localCards state updates immediately
   │
8. Convex reactive query (useQuery) also updates
   │  → serverCards updates → useEffect syncs localCards with serverCards
   │  (this is a second render on the actor's browser — cards are in sync already)
   │
   IF step 5 throws FORBIDDEN:
   └── setLocalCards(originalCards)  ← revert optimistic update
       showToast("You don't have permission to do that.")
```

### 8.2 Data Flow for Comment + @Mention (Complete)

```
1. User finishes typing a comment in Tiptap editor (inside CardModal)
   │
2. User clicks "Submit" (or presses Ctrl+Enter)
   │
3. body = editor.getJSON()  ← Tiptap JSON object, stored as-is
   │
4. await createComment({ cardId, body })  ← Convex mutation
   │  [Server:
   │    requireUser
   │    → fetch card → get boardId
   │    → assertBoardPermission('comment')
   │    → ctx.db.insert('comments', { cardId, boardId, authorId, body, createdAt })
   │    → writeActivityLog(COMMENT_ADDED)
   │    → Walk body JSON tree:
   │        function extractMentions(node):
   │          if node.type === 'mention': collect node.attrs.id
   │          node.content?.forEach(extractMentions)
   │    → For each mentionedUserId where mentionedUserId !== callerId:
   │        ctx.db.insert('notifications', {
   │          userId: mentionedUserId,
   │          type: 'MENTIONED',
   │          boardId, cardId, actorId: callerId,
   │          isRead: false, createdAt
   │        })
   │  ]
   │
5. Convex reactive query auto-delivers new comment to all subscribers:
   │  useQuery(api.comments.listByCard, { cardId })
   │  → All users with CardModal open for this card see comment appear
   │
6. For mentioned users:
   useQuery(api.notifications.listUnread) auto-updates
   → NotificationBell badge count increments in real time
   → No Socket.IO involved — Convex handles this entirely

   NOTE: Socket.IO is NOT used for comments or mentions.
   Both are delivered exclusively via Convex reactive queries.
```

### 8.3 Data Flow for Notification Delivery (Complete)

```
Trigger: any mutation that creates a notification
(createComment with @mention, or updateCard with new assigneeId)
   │
Server (Convex mutation):
   │
   → ctx.db.insert('notifications', {
       userId: targetUserId,     ← the person being notified
       type: 'MENTIONED' | 'ASSIGNED',
       boardId, cardId, actorId,
       isRead: false,
       createdAt: Date.now()
     })
   │
Target user's browser:
   │
   → useQuery(api.notifications.listUnread) is a reactive query
   → Convex pushes the update to all active subscribers
   → NotificationBell: unread count badge increments (+1)
   → NotificationList (if open): new item appears at top
   │
User clicks notification:
   → markAsRead({ notificationId }) Convex mutation
   → isRead = true → reactive query removes it from unread list
   → navigate to board (no deep-link to card in v1)
   │
User clicks "Mark all read":
   → markAllAsRead() Convex mutation — batch patches all unread
   → badge count drops to 0
```

### 8.4 Data Flow for User Sign-Up + Clerk Webhook (Complete)

```
1. User submits sign-up form on /sign-up page
   │
2. Clerk creates the user account (email/password or Google OAuth)
   Clerk stores: clerkId, email, displayName, avatarUrl
   │
3. Clerk immediately fires a webhook:
   POST https://your-app.vercel.app/api/webhooks/clerk
   Headers: svix-id, svix-timestamp, svix-signature
   Body: { type: "user.created", data: { id, email_addresses, ... } }
   │
4. Next.js API route (app/api/webhooks/clerk/route.ts):
   │
   a. Verify signature using Webhook from 'svix':
      const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
      const event = wh.verify(rawBody, headers)
      ← throws if signature invalid → return 400
   │
   b. Extract fields:
      const { id: clerkId, email_addresses, first_name, last_name, image_url } = event.data
      const email = email_addresses[0].email_address
      const name = [first_name, last_name].filter(Boolean).join(' ')
   │
   c. Call Convex internalMutation via fetchMutation:
      await fetchMutation(internal.users.createUser, {
        clerkId, email, name, avatarUrl: image_url
      })
   │
   d. Return 200 OK
   │
5. Convex createUser internalMutation:
   - Check: does a user with this clerkId already exist? (upsert safety)
   - If not: ctx.db.insert('users', { clerkId, email, name, avatarUrl, createdAt })
   - If yes: ctx.db.patch(existingId, { email, name, avatarUrl }) ← handles user.updated
   │
6. From this point, requireUser() in every other mutation can look up the user by clerkId
   │

RACE CONDITION HANDLING:
If the webhook is delayed and the user tries to use the app before createUser runs:
   → requireUser() looks up by clerkId → not found → throws UNAUTHENTICATED
   → Frontend catches this → shows "Setting up your account…" spinner
   → Retries after 1 second (up to 3 times)
   → Webhook typically delivers within 1–2 seconds, so this resolves quickly

user.updated webhook:
   Same handler, same flow, but calls the upsert path (patch existing user)
   Handles: display name change, avatar change in Clerk dashboard
```

---

## 9. TypeScript Type Definitions — Socket Event Payloads

All types live in `types/index.ts`. These are the contracts between the frontend and the Socket.IO server.

```typescript
// ─── Presence ────────────────────────────────────────────────────────────────

export interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl: string;
}

export interface JoinBoardPayload {
  boardId: string;
}

export interface LeaveBoardPayload {
  boardId: string;
}

export interface PresenceInitPayload {
  boardId: string;
  users: PresenceUser[];
}

export interface PresenceUpdatePayload {
  boardId: string;
  users: PresenceUser[];
}

// ─── Cards ───────────────────────────────────────────────────────────────────

export interface CardCreatedPayload {
  boardId: string;
  cardId: string;
  columnId: string;
  title: string;
  orderIndex: number;
}

export interface CardUpdatedPayload {
  boardId: string;
  cardId: string;
  changes: Partial<{
    title: string;
    assigneeId: string | null;
    dueDate: number | null;
  }>;
}

export interface CardMovedPayload {
  boardId: string;
  cardId: string;
  newColumnId: string;
  newOrderIndex: number;
}

export interface CardDeletedPayload {
  boardId: string;
  cardId: string;
}

// ─── Columns ─────────────────────────────────────────────────────────────────

export interface ColumnCreatedPayload {
  boardId: string;
  columnId: string;
  title: string;
  orderIndex: number;
}

export interface ColumnUpdatedPayload {
  boardId: string;
  columnId: string;
  title: string;
}

export interface ColumnDeletedPayload {
  boardId: string;
  columnId: string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessageSentPayload {
  boardId: string;
  messageId: string;
  authorId: string;
  body: string;
  createdAt: number;
}

export interface TypingStartPayload {
  boardId: string;
  userId: string;
  userName: string;
}

export interface TypingStopPayload {
  boardId: string;
  userId: string;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

export interface RateLimitedPayload {
  message: string;
  retryAfterMs: number;
}

// ─── Socket Event Map ────────────────────────────────────────────────────────
// Used to type socket.on() and socket.emit() calls

export interface ServerToClientEvents {
  PRESENCE_INIT: (payload: PresenceInitPayload) => void;
  PRESENCE_UPDATE: (payload: PresenceUpdatePayload) => void;
  CARD_CREATED: (payload: CardCreatedPayload) => void;
  CARD_UPDATED: (payload: CardUpdatedPayload) => void;
  CARD_MOVED: (payload: CardMovedPayload) => void;
  CARD_DELETED: (payload: CardDeletedPayload) => void;
  COLUMN_CREATED: (payload: ColumnCreatedPayload) => void;
  COLUMN_UPDATED: (payload: ColumnUpdatedPayload) => void;
  COLUMN_DELETED: (payload: ColumnDeletedPayload) => void;
  CHAT_MESSAGE_SENT: (payload: ChatMessageSentPayload) => void;
  TYPING_START: (payload: TypingStartPayload) => void;
  TYPING_STOP: (payload: TypingStopPayload) => void;
  RATE_LIMITED: (payload: RateLimitedPayload) => void;
}

export interface ClientToServerEvents {
  JOIN_BOARD: (payload: JoinBoardPayload) => void;
  LEAVE_BOARD: (payload: LeaveBoardPayload) => void;
  CARD_CREATED: (payload: CardCreatedPayload) => void;
  CARD_UPDATED: (payload: CardUpdatedPayload) => void;
  CARD_MOVED: (payload: CardMovedPayload) => void;
  CARD_DELETED: (payload: CardDeletedPayload) => void;
  COLUMN_CREATED: (payload: ColumnCreatedPayload) => void;
  COLUMN_UPDATED: (payload: ColumnUpdatedPayload) => void;
  COLUMN_DELETED: (payload: ColumnDeletedPayload) => void;
  CHAT_MESSAGE_SENT: (payload: ChatMessageSentPayload) => void;
  TYPING_START: (payload: TypingStartPayload) => void;
  TYPING_STOP: (payload: TypingStopPayload) => void;
}
```

Usage in `lib/socket.ts`:
```typescript
import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@/types'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      autoConnect: false,
      transports: ['websocket'],
    })
  }
  return socket
}
```

---

## 10. ConvexProviderWithClerk — Complete Setup

### 10.1 ConvexClient Initialization (`lib/convex.ts`)

```typescript
import { ConvexReactClient } from 'convex/react'

// Singleton — created once, shared via ConvexProviderWithClerk
export const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
)
```

### 10.2 ConvexClerkProvider (`components/providers/ConvexClerkProvider.tsx`)

```typescript
'use client'

import { ClerkProvider, useAuth } from '@clerk/nextjs'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { convex } from '@/lib/convex'

export function ConvexClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
```

**How JWT verification works end-to-end:**
1. `ConvexProviderWithClerk` calls `useAuth().getToken({ template: 'convex' })` automatically before every Convex request
2. Clerk returns a signed JWT for the `convex` audience
3. The JWT is sent in the Authorization header of every Convex WebSocket frame
4. Convex verifies the JWT against Clerk's JWKS endpoint (`https://[clerk-domain]/.well-known/jwks.json`)
5. On success, `ctx.auth.getUserIdentity()` in any query/mutation returns the decoded identity
6. `requireUser()` in `convex/lib/auth.ts` calls `getUserIdentity()`, looks up by `tokenIdentifier`, and returns the user document

### 10.3 requireUser Pattern (`convex/lib/auth.ts`)

```typescript
import { QueryCtx, MutationCtx } from './_generated/server'
import { ConvexError } from 'convex/values'

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'Must be signed in' })
  }
  // tokenIdentifier is the stable, unique id from Clerk: "https://clerk.xxx|user_xxx"
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.tokenIdentifier))
    .unique()
  if (!user) {
    throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'User record not found' })
  }
  return user
}
```

### 10.4 Convex JWT Template Setup (Clerk Dashboard)

In the Clerk dashboard → JWT Templates → Create template named `convex`:
```json
{
  "aud": "convex",
  "sub": "{{user.id}}",
  "iss": "https://your-clerk-domain.clerk.accounts.dev"
}
```
The `aud: "convex"` field is what `ConvexProviderWithClerk` uses to request the correct token template.

---

## 11. fetchMutation — Server-Side Convex Calls (Webhook Handler)

The Clerk webhook handler (`app/api/webhooks/clerk/route.ts`) runs on the Next.js server and needs to call a Convex mutation. It cannot use `useMutation` (React hook). Instead, it uses `fetchMutation` from the Convex HTTP client.

### 11.1 Pattern

```typescript
// app/api/webhooks/clerk/route.ts
import { fetchMutation } from 'convex/nextjs'
import { internal } from '@/convex/_generated/api'

// Inside the POST handler, after verifying the svix signature:
await fetchMutation(internal.users.createUser, {
  clerkId: event.data.id,
  email: event.data.email_addresses[0].email_address,
  name: `${event.data.first_name ?? ''} ${event.data.last_name ?? ''}`.trim(),
  avatarUrl: event.data.image_url,
})
```

### 11.2 Why `internal.users.createUser` and not `api.users.createUser`

`createUser` is an `internalMutation` — it can only be called from:
1. Other Convex functions (internal use)
2. Server-side code via `fetchMutation` with the Convex deployment URL + admin key

This prevents anyone from calling `createUser` directly from the browser (which would bypass Clerk's identity verification).

### 11.3 Authentication for fetchMutation

`fetchMutation` called from a Next.js API route does not carry a user JWT — it uses the Convex deployment's service key (set as `CONVEX_DEPLOYMENT` or `CONVEX_URL` in the server environment). `internalMutation` does not require a user identity — it is trusted server-side code.

```typescript
// The convex/users.ts file:
export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Upsert — safe to call multiple times (idempotent)
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
      })
    } else {
      await ctx.db.insert('users', {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
        createdAt: Date.now(),
      })
    }
  },
})
```

---

## 12. Integration Readiness Checklist

Use this checklist to verify each integration point is correctly wired before deploying.

### 12.1 Clerk

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set in `.env.local` (starts with `pk_test_`)
- [ ] `CLERK_SECRET_KEY` set in `.env.local` (starts with `sk_test_`)
- [ ] `CLERK_WEBHOOK_SECRET` set in `.env.local` (starts with `whsec_`)
- [ ] Clerk JWT template `convex` created with `aud: "convex"` claim
- [ ] Webhook endpoint registered in Clerk dashboard: `https://your-app/api/webhooks/clerk`
- [ ] Webhook subscribed to events: `user.created`, `user.updated`
- [ ] Google OAuth configured in Clerk dashboard (Social Connections → Google)
- [ ] After sign-up, `createUser` runs and a user row appears in Convex dashboard

### 12.2 Convex

- [ ] `NEXT_PUBLIC_CONVEX_URL` set in `.env.local` (starts with `https://`)
- [ ] `npx convex dev` runs without schema errors
- [ ] All tables listed in `convex/schema.ts` appear in Convex dashboard
- [ ] `requireUser()` resolves correctly when called from `npx convex run` in test
- [ ] `assertBoardPermission` throws `FORBIDDEN` for a user with view-only access attempting a mutation

### 12.3 Socket.IO Server

- [ ] `NEXT_PUBLIC_SOCKET_URL` set in `.env.local` (e.g., `http://localhost:3001`)
- [ ] Socket.IO server starts on port 3001 locally
- [ ] Auth middleware verifies Clerk JWT and sets `socket.data.userId`
- [ ] Browser console shows no CORS errors when connecting to Socket.IO
- [ ] `JOIN_BOARD` event joins the socket room; `socket.rooms` includes the boardId
- [ ] `CARD_MOVED` emitted on client A appears on client B (two browser tabs test)
- [ ] Unauthenticated connection attempt is rejected by auth middleware

### 12.4 Upstash Redis

- [ ] `UPSTASH_REDIS_REST_URL` set in Socket.IO server `.env`
- [ ] `UPSTASH_REDIS_REST_TOKEN` set in Socket.IO server `.env`
- [ ] Redis adapter initializes without TLS errors (use `rediss://` + `rejectUnauthorized: false`)
- [ ] Rate limit: triggering more than 10 `CARD_MOVED` events per second returns `RATE_LIMITED`

### 12.5 End-to-End Feature Readiness

| Feature | Convex Ready | Socket.IO Ready | UI Ready |
|---|---|---|---|
| User sign-up + user record | createUser internalMutation | — | Clerk embed |
| Create workspace | createWorkspace mutation | — | CreateWorkspaceForm |
| Invite member | inviteMember + acceptInvite | — | InviteMemberDialog |
| Create board | createBoard mutation | — | CreateBoardDialog |
| Create column | createColumn mutation | COLUMN_CREATED emit | AddColumnButton |
| Create card | createCard mutation | CARD_CREATED emit | AddCardInput |
| Move card | moveCard mutation | CARD_MOVED emit | dnd-kit onDragEnd |
| Edit card | updateCard mutation | CARD_UPDATED emit | CardModal |
| Delete card | deleteCard mutation | CARD_DELETED emit | CardModal delete btn |
| Comment | createComment mutation | — (Convex only) | CommentThread |
| @mention notification | createComment extracts mentions | — | NotificationBell |
| Assignment notification | updateCard with new assigneeId | — | NotificationBell |
| Board chat | sendChatMessage mutation | CHAT_MESSAGE_SENT emit | ChatPanel |
| Typing indicator | — | TYPING_START/STOP | ChatInput |
| Online presence | — | JOIN_BOARD/LEAVE_BOARD | PresenceBar |
| Activity log | every mutation writes log | — | ActivityLogPanel |
| Dark mode | — | — | ThemeProvider + toggle |
