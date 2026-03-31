# Tools & Technologies Document: OnPoint

**Version 1.0 | March 2026**

> **Cost Policy:** This is a learning and portfolio project. Every tool selected must have a free tier that covers the full development, demo, and portfolio-hosting lifecycle at zero cost. Where a tool has a paid tier, this document explicitly confirms the free tier is sufficient and explains why.

---

## Table of Contents

1. [Language](#1-language)
2. [Frontend Framework](#2-frontend-framework)
3. [UI Styling](#3-ui-styling)
4. [Component Library](#4-component-library)
5. [Authentication](#5-authentication)
6. [Database](#6-database)
7. [Real-Time Layer — WebSocket Server](#7-real-time-layer--websocket-server)
8. [Real-Time Layer — Database Subscriptions](#8-real-time-layer--database-subscriptions)
9. [Pub/Sub for Multi-Instance Broadcasting](#9-pubsub-for-multi-instance-broadcasting)
10. [Drag and Drop](#10-drag-and-drop)
11. [Rich Text Editor](#11-rich-text-editor)
12. [Deployment — Frontend](#12-deployment--frontend)
13. [Deployment — WebSocket Server](#13-deployment--websocket-server)
14. [Deployment — Redis](#14-deployment--redis)
15. [Version Control & Repository Hosting](#15-version-control--repository-hosting)
16. [Integration Map](#16-integration-map)
17. [Full Stack at a Glance](#17-full-stack-at-a-glance)

---

## 1. Language

### TypeScript

**Role:** The single language used across the entire codebase — frontend UI, backend server functions, database schema, WebSocket server, and shared types.

**Why TypeScript over JavaScript:**
TypeScript adds static typing on top of JavaScript, which means bugs are caught at compile time rather than at runtime. For a project like OnPoint — where the same data shapes (a `Card`, a `BoardMember`, a `NotificationPayload`) flow between the client, the WebSocket server, and the database layer — having shared, enforced type definitions eliminates an entire class of bugs caused by mismatched field names or wrong data shapes. This is especially important during a 5-week build where moving fast can introduce subtle data contract mismatches between layers.

**Why not plain JavaScript:**
In a typed project, JavaScript removes the safety net. The refactoring cost of going untyped outweighs the minor inconvenience of adding types upfront.

**Cost:** Free. Open source.

---

## 2. Frontend Framework

### Next.js 14 (App Router)

**Role:** The core frontend framework. Responsible for routing, page rendering, and the React component tree. The App Router architecture is used (not the older Pages Router).

**Specific responsibilities:**
- File-based routing for all application pages (login, workspace dashboard, board view)
- Server components for initial page loads (SEO-friendly, fast first paint)
- Client components for all interactive, real-time UI (board, card modal, chat)
- API routes for any server-side endpoints needed (e.g., Clerk webhook receiver)
- Middleware for auth-protected route redirection

**Why Next.js over plain React (Vite/CRA):**
Next.js provides a production-grade setup out of the box — routing, image optimization, environment variables, API routes — with no configuration. A plain React SPA would require manually wiring together React Router, a separate Express server for API endpoints, and more. For a portfolio project, Next.js also means deployment to Vercel is a single command with zero configuration.

**Why App Router over Pages Router:**
App Router is the current default and the future of Next.js. It enables React Server Components, which reduce client-side JavaScript bundle size for non-interactive parts of the UI (e.g., the activity log, notification list). It is also the version documented in all current Next.js resources.

**Why not Remix, SvelteKit, or Nuxt:**
Next.js has the largest ecosystem, the most community examples for integrating Clerk and Convex specifically (both provide official Next.js SDKs), and the most relevant documentation. Choosing Next.js means fewer integration gaps to solve manually.

**Cost:** Free. Open source (MIT license).

---

## 3. UI Styling

### Tailwind CSS

**Role:** Utility-first CSS framework used for all visual styling. Every spacing value, color, font size, border, and responsive breakpoint is expressed as a Tailwind utility class directly in the component markup — no separate CSS files.

**Specific responsibilities:**
- Layout (flexbox, grid, spacing, sizing)
- Responsive design (`sm:`, `md:`, `lg:` breakpoints for mobile layout)
- Dark mode (`dark:` prefix variants)
- Visual states (hover, focus, active, disabled)
- Animation utilities for the drag ghost and card transitions

**Why Tailwind over plain CSS or CSS Modules:**
Tailwind eliminates the context-switching between JSX and a separate `.css` file. For a fast-moving solo project, co-locating styles with the component markup makes iteration significantly faster. Tailwind's constraint system (a fixed set of spacing and color values) also produces more visually consistent UIs than freehand CSS.

**Why not Tailwind + custom CSS:**
Custom CSS is only added when Tailwind's utilities cannot express a specific effect (extremely rare). Mixing paradigms increases the mental overhead of maintaining the codebase.

**Cost:** Free. Open source (MIT license).

---

## 4. Component Library

### shadcn/ui

**Role:** A collection of accessible, pre-built React UI components that are copied directly into the project (not installed as a dependency). Used for all standard UI elements: modals, dropdowns, buttons, tooltips, popovers, form inputs, date pickers, and tabs.

**Specific responsibilities:**
- Card modal (Dialog component)
- Dropdowns for assignee selector and label picker (Popover + Command)
- Due date picker (Calendar + Popover)
- Notification badge and tooltip (Tooltip component)
- Form inputs for card title, workspace name, comment box
- Tab navigation inside card modal (card details / history)
- Toast notifications for errors and confirmations

**Why shadcn/ui over other component libraries (MUI, Chakra, Mantine):**
shadcn/ui components are not a black-box npm package. The source code is copied into your project, meaning you own the components and can modify them freely without fighting library abstractions. Every component is built on Radix UI primitives (which handle accessibility, keyboard navigation, and ARIA attributes correctly) and styled with Tailwind. This means the components integrate natively with the project's Tailwind setup and dark mode configuration, with no theming API to learn.

MUI, Chakra, and Mantine use their own styling systems (emotion, CSS-in-JS), which conflict with Tailwind and add bundle size overhead.

**Why not building components from scratch:**
For a 5-week project, building a fully accessible modal, date picker, and command palette from scratch would consume weeks. shadcn/ui provides these at zero effort cost while remaining fully customizable.

**Cost:** Free. Open source (MIT license). Components are code you own.

---

## 5. Authentication

### Clerk

**Role:** Handles the full authentication lifecycle — user sign-up, sign-in, session management, and JWT issuance. Clerk is used exclusively for identity; user profile data (name, avatar URL) is synced into the application's own database via a webhook.

**Specific responsibilities:**
- Email and password sign-up and login
- Google OAuth sign-in
- First-time user session detection (to trigger onboarding prompt)
- Issuing JWTs used to authenticate requests to both Convex (database) and the Socket.IO server (WebSocket)
- Webhooks: when a new user signs up (`user.created` event), Clerk sends a webhook to a Next.js API route, which creates the user record in Convex

**Why Clerk over building custom auth:**
Auth is one of the most dangerous things to build from scratch. Password hashing, session management, OAuth flows, CSRF protection, and token rotation all have well-known pitfalls. Clerk handles all of this correctly, including the Convex-specific integration (`ConvexProviderWithClerk`), which automatically attaches the current user's JWT to every Convex query and mutation. This alone saves days of integration work.

**Why Clerk over Firebase Auth, Auth.js (NextAuth), or Supabase Auth:**
- Firebase Auth: Ties you to the Firebase ecosystem and has a less ergonomic API for JWTs needed by external WebSocket servers.
- Auth.js (NextAuth): Session-based, not JWT-based by default. Generating a JWT for Socket.IO verification requires extra configuration. Also lacks a pre-built Convex integration.
- Supabase Auth: Excellent, but using Supabase Auth implies using Supabase as the database too. Since this project uses Convex, mixing two BaaS platforms adds complexity.

Clerk has official, first-party integrations with both Next.js and Convex, is JWT-native, and provides a hosted authentication UI that can be embedded in the app in minutes.

**Cost:** Free tier — up to 10,000 Monthly Active Users (MAU). A student portfolio project will never approach this limit. Free forever for this use case.

---

## 6. Database

### Convex

**Role:** The primary application database and serverless backend. All persistent application data lives in Convex. Convex is also the server-side logic layer — all data reads and writes happen through typed TypeScript functions (queries, mutations, and actions) that run on Convex's infrastructure.

**Specific responsibilities:**
- Storing all application data: users, workspaces, workspace_members, boards, board_members, columns, cards, card_labels, comments, activity_logs, notifications, chat_messages
- Enforcing all authorization logic server-side inside mutation and query handlers (permission checks before every read or write)
- Reactive queries: the Convex client on the frontend automatically re-renders any component subscribed to a Convex query whenever the underlying data changes — used for card state, comment threads, activity logs, and notifications
- File storage (built-in): Convex provides an integrated file storage API used for card attachments in post-v1

**Why Convex over a traditional database (PostgreSQL, MySQL):**
A traditional relational database requires a separate server to run, a separate ORM to query it, and a separate API layer (Express or tRPC) to expose data to the frontend. Convex replaces all three. The schema is defined in TypeScript, queries are written in TypeScript, and the real-time reactivity (subscriptions) is built in — no polling, no separate WebSocket setup for database updates.

**Why Convex over Supabase:**
Supabase is excellent and would also work. The decision to use Convex comes down to two factors: (1) Convex has a first-party, well-documented integration with Clerk via `ConvexProviderWithClerk`, which simplifies the auth-database connection significantly; (2) Convex's TypeScript-first query API means no raw SQL to write, which reduces bugs and makes the codebase more maintainable. Supabase would require raw SQL for complex queries and a separate Realtime channel setup.

**Why Convex over Firebase/Firestore:**
Firebase's data model (deeply nested JSON documents) does not map well to a relational data model like OnPoint's (cards belong to columns, columns belong to boards, boards belong to workspaces). Convex uses a flat document model with typed IDs for relationships, which is both more readable and more queryable.

**Cost:** Free tier — 1,000,000 function calls per month, 8 GB storage, 1 GB bandwidth. Vastly more than sufficient for a demo and portfolio project.

---

## 7. Real-Time Layer — WebSocket Server

### Socket.IO

**Role:** Manages all low-latency, intent-based real-time events between users on the same board. Runs as a standalone Node.js server, separate from the Next.js application, deployed on Render.

**Specific responsibilities:**
- Managing WebSocket connections from all connected clients
- Grouping connections into board rooms (each board has a room identified by its board ID)
- Receiving events from clients (CARD_MOVED, CARD_UPDATED, CARD_CREATED, CARD_DELETED, COLUMN_CREATED, COLUMN_UPDATED, COLUMN_DELETED, COMMENT_ADDED, CHAT_MESSAGE, TYPING_START, TYPING_STOP)
- Validating the sender's JWT before processing any event (auth check before broadcast)
- Broadcasting validated events to all other connections in the same board room
- Managing presence: tracking which users are in which board room and broadcasting PRESENCE_UPDATE events on join/leave

**Why Socket.IO over raw WebSockets (`ws` library):**
Socket.IO adds automatic reconnection, room management, event namespacing, and fallback to HTTP long-polling in environments where WebSockets are blocked. These are all non-trivial to implement correctly with raw WebSockets. For a project where demo reliability matters, Socket.IO's reconnection logic is particularly valuable.

**Why a separate Socket.IO server instead of using Next.js API routes for WebSockets:**
Next.js on Vercel does not support long-lived WebSocket connections — Vercel's serverless functions time out after a maximum of 60 seconds. A real-time board requires persistent connections. The Socket.IO server runs on Render as a long-lived Node.js process, which is the correct hosting model for WebSockets.

**Why not using Convex reactive queries for all real-time events (instead of Socket.IO):**
Convex reactive queries are used for data subscriptions (card state, comments, activity log). However, presence (who is online right now) is inherently ephemeral and not stored in the database — it exists only in the Socket.IO server's memory. Additionally, Convex reactive queries add a round-trip through Convex's infrastructure, whereas Socket.IO broadcasts directly between connected clients and the server, achieving sub-100ms latency for card moves and chat messages.

**Cost:** Free. Open source (MIT license). The server itself is Node.js, which is free. Hosting cost is covered in section 13.

---

## 8. Real-Time Layer — Database Subscriptions

### Convex Reactive Queries (Built Into Convex)

**Role:** Complements Socket.IO for real-time UI updates that are data-driven rather than event-driven. Convex automatically pushes updated query results to subscribed components whenever the underlying data changes.

**Used for:**
- Card detail data (title, description, assignee, labels, due date) — ensuring the card modal always shows the latest state
- Comment thread on a card — new comments appear without any manual event handling
- Activity log feed — new entries appear as actions occur
- Notification list and unread count — updates in real time when new notifications are created
- Workspace board list — new boards appear immediately after creation

**Why two real-time mechanisms (Socket.IO + Convex reactive queries) instead of one:**

| Mechanism | Best For |
|---|---|
| Socket.IO | Presence, typing indicators, card moves, chat messages — ephemeral, low-latency, session-scoped events that do not need to survive a reconnection |
| Convex Reactive Queries | Persistent data (card content, comments, activity log, notifications) — these must survive disconnection and be correct even if the WebSocket was briefly down |

Using only Socket.IO would require manually managing client state and handling missed events during reconnection. Using only Convex reactive queries would not support ephemeral presence (who is online right now is not stored in the DB). The combination gives the best of both: instant event delivery via Socket.IO, with Convex as the source of truth that self-heals after any disruption.

**Cost:** Included in Convex free tier (no additional cost).

---

## 9. Pub/Sub for Multi-Instance Broadcasting

### Redis (via Upstash — Free Tier)

**Role:** Acts as a message broker between multiple instances of the Socket.IO server. When a card move event arrives at Socket.IO server instance A, it must be broadcast to users connected to instance B. Redis pub/sub (via the `@socket.io/redis-adapter`) enables this cross-instance communication.

**Specific responsibilities:**
- Receiving a published event from any Socket.IO server instance
- Fanning the event out to all other Socket.IO server instances
- Each instance then broadcasts to its locally connected clients in the correct board room
- Also used for rate limiting: tracking WebSocket event counts per user per second to enforce rate limits

**Why Redis:**
Redis is the standard tool for this exact use case — pub/sub message passing between stateless server instances. The `@socket.io/redis-adapter` is the official, maintained adapter for Socket.IO and integrates in under 10 lines of code.

**Why even implement multi-instance pub/sub for a student project:**
OnPoint only runs one Socket.IO instance. But demonstrating that you know *how* to scale it horizontally (the Redis adapter) is exactly the kind of knowledge that separates strong backend engineers in technical interviews. The implementation cost is minimal; the learning and portfolio value is high.

**Why Upstash over Redis hosted on Railway or Render:**
Upstash offers a serverless Redis with a generous free tier (10,000 commands per day, no server to manage). For a demo project, this is more than sufficient. Railway's Redis plugin requires a paid plan; Render's Redis is also paid. Upstash is the only zero-cost, zero-maintenance Redis option.

**Cost:** Free tier — 10,000 commands per day, 256 MB storage. A demo project with < 20 concurrent users will use far fewer than 10,000 Redis commands per day.

---

## 10. Drag and Drop

### dnd-kit

**Role:** Provides the drag-and-drop interaction layer for the Kanban board. Used to drag cards between columns and reorder cards within a column.

**Specific responsibilities:**
- Tracking drag start, drag over, and drag end events
- Rendering a ghost/preview of the dragged card during the drag
- Highlighting the drop zone (column or card gap) as the user hovers
- On drag end: computing the new column and position index, then triggering the Convex mutation to persist the change
- Ensuring the board remains accessible via keyboard drag-and-drop (dnd-kit is fully keyboard-accessible by default)

**Why dnd-kit over react-beautiful-dnd:**
`react-beautiful-dnd` is no longer actively maintained (last meaningful update was 2022). It also does not support React 18's concurrent features correctly, which can cause visual glitches. `dnd-kit` is actively maintained, supports React 18, is significantly more flexible (supports any layout — vertical, horizontal, grid), has better performance via pointer events (not mouse events), and has first-class TypeScript support.

**Why not HTML5 drag and drop API:**
The native HTML5 drag API has inconsistent behavior across browsers, poor touch support (required for mobile), and no built-in ghost preview control. Building a smooth Kanban drag experience on top of it requires significant custom code.

**Cost:** Free. Open source (MIT license).

---

## 11. Rich Text Editor

### Tiptap

**Role:** Provides the rich text editing experience for card descriptions and comment bodies. Based on ProseMirror, it supports Markdown-style formatting, @mentions, and extensible node types.

**Specific responsibilities:**
- Card description field: rich text editor with support for headings, bold, italic, code blocks, bullet lists, and inline code
- Comment input: single-line rich text input with @mention support (typing `@` opens a member dropdown)
- @mention extension: renders @mentions as styled, non-editable inline nodes within the text, each linked to a specific user ID
- Storing editor content as JSON (not raw HTML) in the Convex database — JSON is safer (no XSS risk from stored HTML) and more portable
- Rendering stored JSON content as read-only formatted text in the card modal view and activity log

**Why Tiptap over a plain `<textarea>`:**
A `<textarea>` cannot render formatted text, inline mentions as styled nodes, or code blocks. Once the product spec includes Markdown support and @mentions, a rich text editor is the correct solution.

**Why Tiptap over Quill, Slate, or Draft.js:**
- Quill: Older, less maintained, no TypeScript-first API, limited extensibility.
- Slate: Powerful but requires building all UI from scratch — no pre-built toolbar, no pre-built mention extension. Very high implementation cost.
- Draft.js: Facebook-maintained but not actively developed; has known issues with React 18; no TypeScript types in the main package.

Tiptap is actively maintained, has a first-class TypeScript API, ships with a `@tiptap/extension-mention` extension for @mentions, and integrates cleanly with React. The core Tiptap library and all extensions used in this project are open source and free.

**Cost:** Free. The Tiptap core and all extensions used (StarterKit, Mention, Placeholder) are open source (MIT license). Tiptap Pro extensions (AI, Comments) are paid and are not used.

---

## 12. Deployment — Frontend

### Vercel

**Role:** Hosts and deploys the Next.js application. Connected to the GitHub repository; every push to the `main` branch triggers an automatic deployment.

**Specific responsibilities:**
- Building and deploying the Next.js App Router application
- Serving the frontend globally via Vercel's CDN
- Running Next.js API routes (serverless functions) for the Clerk webhook receiver
- Managing environment variables securely (Clerk keys, Convex URL, Socket.IO server URL)
- Providing a public HTTPS URL for the live portfolio-ready application

**Why Vercel:**
Vercel is the company that created Next.js. Their deployment platform has zero-configuration support for Next.js App Router, including server components, API routes, and Edge middleware. Deployment is a single CLI command or a GitHub push. No other platform matches this level of zero-effort Next.js integration.

**Why not Netlify:**
Netlify supports Next.js but has historically lagged behind Vercel in supporting Next.js's newest features (App Router, React Server Components). For a project built on the latest Next.js, Vercel is the safer choice.

**Why not self-hosting on a VPS (DigitalOcean, AWS EC2):**
A VPS requires managing the server, SSL certificates, nginx configuration, and process management. Vercel does all of this automatically. For a student project, the operational overhead of a VPS is unjustifiable.

**Cost:** Free tier — unlimited personal projects, 100 GB bandwidth per month, automatic HTTPS, custom domains. Fully sufficient for a portfolio project.

---

## 13. Deployment — WebSocket Server

### Render (Free Tier — Web Service)

**Role:** Hosts the standalone Socket.IO server as a persistent Node.js web service. Unlike Vercel (serverless), Render keeps the process running continuously — required for WebSocket connections.

**Specific responsibilities:**
- Running the Socket.IO Node.js server as a persistent process
- Accepting WebSocket connections from clients (upgrade from HTTP)
- Maintaining board rooms and connection state in memory
- Communicating with Redis (Upstash) via the Socket.IO Redis adapter

**Why Render over Railway:**
Railway previously offered a free tier but now requires a paid subscription ($5/month minimum). Render offers a genuine free tier for web services (750 hours/month — enough for one always-on service). For a zero-cost project, Render is the only like-for-like free alternative to Railway for hosting a persistent Node.js server.

**Why not Fly.io:**
Fly.io has a free tier but requires a credit card on file to use it. Render does not require a credit card for the free tier, making sign-up simpler for a student project.

**Why not putting the Socket.IO server inside Next.js:**
As explained in section 7, Vercel's serverless model does not support persistent WebSocket connections. The Socket.IO server must run as a separate, always-on process on a platform that supports persistent connections.

**Free tier caveat:** Render's free tier web services spin down after 15 minutes of inactivity and take ~30 seconds to cold-start on the first request. For a live demo, this is mitigated by opening the board 1 minute before presenting, which keeps the server warm. For a recorded portfolio demo video, this is a non-issue.

**Cost:** Free tier — 750 service hours per month (sufficient for one always-on service). No credit card required.

---

## 14. Deployment — Redis

### Upstash (Serverless Redis — Free Tier)

**Role:** Provides the hosted Redis instance used by the Socket.IO Redis adapter for cross-instance pub/sub and rate limiting. Accessed over HTTPS from the Socket.IO server on Render.

**Why Upstash over alternatives:**
As detailed in section 9, Upstash is the only zero-cost, zero-maintenance Redis option. Railway Redis and Render Redis are paid. Self-hosting Redis on a free VPS is operationally expensive for a student project.

**Cost:** Free tier — 10,000 commands per day, 256 MB max data size. Zero cost forever for demo-scale usage.

---

## 15. Version Control & Repository Hosting

### Git + GitHub

**Role:** Git for local version control; GitHub for remote repository hosting, code backup, and portfolio visibility.

**Specific responsibilities:**
- Tracking all code changes with commit history
- Enabling the Vercel ↔ GitHub integration (auto-deploy on push to `main`)
- Serving as the public portfolio artifact — the GitHub repository URL appears on the resume alongside the live demo link
- Branch strategy: `main` for stable deployable code; feature branches (`feat/card-modal`, `feat/socket-rooms`) for in-progress work

**Why GitHub over GitLab or Bitbucket:**
GitHub is the dominant platform for open-source and portfolio projects. Recruiters and interviewers expect a GitHub link. Vercel's auto-deploy integration is best supported with GitHub.

**Cost:** Free for public and private repositories.

---

## 16. Integration Map

This section documents how each tool connects to the others. Understanding these integration points is critical — they are the most common source of bugs and setup errors.

### 16.1 Clerk → Convex (Auth Integration)

```
Next.js app is wrapped with <ConvexProviderWithClerk>
  → On every Convex query or mutation, ConvexProviderWithClerk automatically:
      1. Retrieves the current Clerk JWT (if the user is signed in)
      2. Attaches it to the Convex request as a Bearer token
  → Inside Convex query/mutation handlers:
      ctx.auth.getUserIdentity() verifies the JWT and returns the Clerk user ID (subject field)
      The Clerk user ID is used to look up the internal user record in the Convex `users` table
```

**Setup requirement:** Convex must be configured with Clerk's JWKS URL so it can verify Clerk JWTs. This is a one-time configuration in the Convex dashboard (Issuer URL set to Clerk's domain).

### 16.2 Clerk → Convex (User Sync via Webhook)

```
New user signs up via Clerk
  → Clerk fires `user.created` webhook to: https://your-app.vercel.app/api/webhooks/clerk
  → Next.js API route (app/api/webhooks/clerk/route.ts) receives the event
  → API route calls a Convex mutation: createUser({ clerkId, email, name, avatarUrl })
  → Convex creates the user record in the `users` table
  → All future Convex permission checks use this internal user record
```

**Setup requirement:** Clerk webhook endpoint must be registered in the Clerk dashboard pointing to the Vercel deployment URL. The `CLERK_WEBHOOK_SECRET` environment variable must be set in Vercel to verify incoming webhook payloads (prevents spoofing).

### 16.3 Clerk → Socket.IO (WebSocket Auth)

```
Client wants to connect to the Socket.IO server
  → Client calls Clerk's getToken() to retrieve the current session JWT
  → Client passes the JWT in the Socket.IO connection handshake:
      const socket = io(SOCKET_URL, { auth: { token: clerkJwt } })
  → Socket.IO server's middleware intercepts every new connection:
      1. Extracts the JWT from socket.handshake.auth.token
      2. Verifies the JWT using Clerk's public key (via @clerk/backend verifyToken())
      3. If valid: attaches the decoded user identity to the socket object and allows connection
      4. If invalid or expired: emits an error and disconnects the socket
```

**Setup requirement:** The Socket.IO server needs the `CLERK_PUBLISHABLE_KEY` (or the JWKS URL) as an environment variable on Render to verify tokens without calling Clerk's API on every event.

### 16.4 Next.js Client → Convex (Data Layer)

```
React component needs data (e.g., list of cards for a board):
  const cards = useQuery(api.cards.listByBoard, { boardId })
  → Convex client sends the query to Convex's servers
  → Convex executes the TypeScript query function server-side
  → Convex returns the result and keeps the subscription open
  → Whenever the underlying data changes, Convex pushes the new result automatically
  → The React component re-renders with the updated data

React component needs to write data (e.g., move a card):
  const moveCard = useMutation(api.cards.move)
  await moveCard({ cardId, newColumnId, newOrderIndex })
  → Convex client sends the mutation to Convex's servers
  → Convex executes the TypeScript mutation function server-side (including permission checks)
  → Convex updates the database and returns success or throws ConvexError
  → Any useQuery subscribers watching this data receive the updated result automatically
```

### 16.5 Next.js Client → Socket.IO Server (Real-Time Events)

```
User drags a card to a new column:
  → dnd-kit fires onDragEnd event in the React component
  → Component calls: socket.emit('CARD_MOVED', { cardId, newColumnId, newOrderIndex })
  → AND: Component calls the Convex moveCard mutation (source of truth write)
  → Socket.IO server receives 'CARD_MOVED'
  → Server validates the JWT (already done at connection time)
  → Server emits 'CARD_MOVED' to all sockets in the board room (except sender)
  → Other clients receive the event and update their local card state immediately
  → Convex reactive query update arrives shortly after and confirms the final state
```

### 16.6 Socket.IO Server → Upstash Redis (Pub/Sub Adapter)

```
Socket.IO server is initialized with the Redis adapter:
  const pubClient = new Redis(process.env.UPSTASH_REDIS_URL)
  const subClient = pubClient.duplicate()
  io.adapter(createAdapter(pubClient, subClient))

When instance A receives a 'CARD_MOVED' event for board room "board-123":
  → Instance A publishes the event to Redis channel "socket.io#board-123"
  → Redis delivers the message to all other instances subscribed to that channel
  → Instance B (and C, D...) receive the message from Redis
  → Each instance emits 'CARD_MOVED' to its locally connected clients in room "board-123"
```

### 16.7 dnd-kit → Convex + Socket.IO (Card Move Pipeline)

```
User lifts a card (drag start):
  → dnd-kit renders a drag ghost; highlights valid drop zones
  → No network calls yet

User drops a card (drag end):
  → dnd-kit's onDragEnd fires with { active: cardId, over: targetColumnId, newIndex }
  → Component computes new orderIndex using the gap strategy
  → TWO parallel calls:
      1. socket.emit('CARD_MOVED', payload)     ← instant broadcast to other users
      2. convex.moveCard(payload)               ← persists to database
  → Component applies optimistic update locally (card appears in new position immediately)
  → When Convex reactive query updates, it confirms or corrects the optimistic position
```

### 16.8 Tiptap → Convex (Rich Text Storage)

```
User types in a card description field (Tiptap editor):
  → Tiptap maintains the document as a ProseMirror JSON structure internally

User clicks Save:
  → Component calls: editor.getJSON() → returns the document as a plain JSON object
  → Component calls Convex mutation: updateCard({ cardId, description: editorJson })
  → Convex stores the JSON object in the `cards.description` field

User opens a card (read mode):
  → Component fetches the card via useQuery
  → Component renders: <EditorContent editor={readOnlyEditor} /> with the stored JSON as initial content
  → Tiptap renders the JSON as formatted HTML in read-only mode
```

**Security note:** Storing content as JSON (not HTML) means there is no stored HTML to inject. Tiptap renders the JSON to HTML only on the client, in a controlled environment.

---

## 17. Full Stack at a Glance

| Layer | Tool | Role | Cost |
|---|---|---|---|
| Language | TypeScript | Type-safe code across entire stack | Free |
| Frontend Framework | Next.js 14 (App Router) | Routing, rendering, API routes | Free |
| UI Styling | Tailwind CSS | Utility-first styling, dark mode, responsive | Free |
| Component Library | shadcn/ui | Pre-built accessible UI components | Free |
| Authentication | Clerk | Identity, JWTs, OAuth, webhooks | Free (≤10k MAU) |
| Database & Backend | Convex | Persistent storage, server logic, auth enforcement | Free (≤1M calls/mo) |
| WebSocket Server | Socket.IO (Node.js) | Real-time event broadcasting, presence, chat | Free (open source) |
| DB Subscriptions | Convex Reactive Queries | Real-time data push for persistent data | Free (included) |
| Pub/Sub | Upstash Redis | Cross-instance Socket.IO broadcasting | Free (≤10k cmds/day) |
| Drag and Drop | dnd-kit | Kanban card drag-and-drop interaction | Free |
| Rich Text | Tiptap | Card descriptions, @mention comments | Free |
| Deploy — Frontend | Vercel | Next.js hosting, CDN, serverless functions | Free |
| Deploy — WS Server | Render | Persistent Node.js Socket.IO hosting | Free (750 hrs/mo) |
| Deploy — Redis | Upstash | Hosted Redis, no server to manage | Free (included above) |
| Version Control | Git + GitHub | Code history, portfolio visibility, CI/CD trigger | Free |

**Total monthly cost at demo scale: $0.00**
