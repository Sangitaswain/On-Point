# OnPoint

A real-time, collaborative Kanban project management board. Every change any team member makes — moving a card, editing a task, posting a comment — is instantly visible to everyone else on the board with no page refresh required.

Built as a portfolio/learning project. Every tool used has a free tier that covers the full development and demo lifecycle at zero cost.

---

## What Is This?

OnPoint is a Trello-style board where small teams (2–8 people) organize work using columns and cards. The core value is **live synchronization** — you see your teammates' actions the moment they happen.

**Who it's for:**
- College project teams coordinating assignments
- Hackathon teams managing tasks during a sprint
- Early-stage dev teams who don't want per-seat pricing
- Freelance pairs who need a shared live workspace

---

## Features (Implemented: Steps 1–8)

### Authentication & Onboarding
- Email/password sign-up and sign-in
- Google OAuth sign-in
- Persistent sessions — no re-login on return visits
- New users are routed to onboarding to create or join a workspace

### Workspace Management
- Create a workspace with a name (slug auto-generated)
- Invite members by email or shareable invite link
- Role system: **Owner**, **Admin**, **Member**, **Guest**
- Transfer ownership, remove members

### Board Management
- Create boards inside a workspace
- Board visibility: **Private** or **Workspace-wide**
- Board-level permission override per member: **Edit**, **Comment**, **View**

### Columns & Cards
- Add, rename, reorder, and delete columns
- Add cards with: title, rich-text description, assignee, color labels, due date
- Card history: full change log (who changed what, when)
- Delete column with confirmation when it contains cards

### Drag and Drop
- Drag cards between columns and reorder within a column
- Position persists in database immediately on drop
- Visual feedback: ghost card + drop zone highlight

### Real-Time Socket.IO Server (Step 8)
- Standalone Node.js server running on port 3001
- Authenticated connections using Clerk JWTs
- Board rooms — each board is a Socket.IO room
- Broadcasts: `CARD_CREATED`, `CARD_UPDATED`, `CARD_MOVED`, `CARD_DELETED`, `COLUMN_CREATED`, `COLUMN_UPDATED`, `COLUMN_DELETED`, `TYPING_START`, `TYPING_STOP`, `CHAT_MESSAGE_SENT`
- Presence tracking (in-memory): who is on which board
- Rate limiting: 30 events per 10-second window per user (Redis-backed)

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Language | TypeScript | Shared types across frontend, backend, and WebSocket server catch bugs at compile time |
| Frontend Framework | Next.js 14 (App Router) | File-based routing, server components, API routes, Vercel deploy with zero config |
| Styling | Tailwind CSS | Utility classes co-located with components — fast iteration, consistent design system |
| Component Library | shadcn/ui | Components you own (copied into the project, not a black-box npm dep), built on Radix UI (fully accessible), styled with Tailwind |
| Authentication | Clerk | JWT-native, first-party integrations for both Next.js and Convex, handles OAuth/email/session management — safe auth without building it from scratch |
| Database & Backend | Convex | TypeScript-first serverless backend — replaces a database + ORM + API layer. Reactive queries push updates to subscribed components automatically |
| WebSocket Server | Socket.IO | Standalone Node.js server for low-latency real-time events. Handles reconnection, room management, and fallback — things raw WebSockets don't give you |
| Pub/Sub (multi-instance) | Upstash Redis | Socket.IO Redis Adapter allows multiple server instances to broadcast to each other. Upstash is serverless Redis with a free tier |
| Drag and Drop | dnd-kit | Accessible, headless drag-and-drop. Works with keyboard nav and touch. `@dnd-kit/sortable` handles Kanban reordering |
| Deployment — Frontend | Vercel | Free tier, zero-config Next.js deploy |
| Deployment — WebSocket | Render | Free tier long-lived Node.js process (Vercel serverless can't hold WebSocket connections) |
| Deployment — Redis | Upstash | Serverless Redis, free tier |

---

## Architecture Overview

```
Browser (Next.js App)
    │
    ├── Convex Client ──────────────────► Convex Cloud (DB + serverless functions)
    │   (queries, mutations, auth)            └── stores all persistent data
    │
    └── Socket.IO Client ───────────────► Socket.IO Server (Node.js on Render)
        (real-time events)                    ├── Clerk JWT auth middleware
                                              ├── Board room management
                                              ├── Presence tracking (in-memory)
                                              └── Redis Adapter ──► Upstash Redis
                                                   (pub/sub for multi-instance broadcast)

Auth flow:
  Clerk → issues JWT → used by BOTH Convex (database auth) AND Socket.IO (WebSocket auth)
```

**Two real-time layers, different jobs:**
- **Convex reactive queries** — data-driven updates (comments, activity logs, notifications, card state). Convex pushes new query results to subscribed React components automatically.
- **Socket.IO** — intent-driven events (card moved, user typing, chat message). Sub-100ms latency. Also handles presence (who's online) which is ephemeral and never stored in the database.

---

## Prerequisites

Before running this project you need accounts and API keys from three services. All are free.

### 1. Clerk (Authentication)
1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. From **API Keys**, copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Your **JWT Issuer Domain** is shown in the Clerk dashboard — format: `https://<instance>.clerk.accounts.dev`
5. Set up a **Webhook** pointing to `https://YOUR_DOMAIN/api/webhooks/clerk` with events: `user.created`, `user.updated`. Copy the signing secret (`CLERK_WEBHOOK_SECRET`).

### 2. Convex (Database & Backend)
1. Create an account at [convex.dev](https://convex.dev)
2. Run `npx convex dev` in the project root — it will create a project and auto-populate `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` in `.env.local`
3. In your Convex dashboard → **Settings → Authentication**, add Clerk as an auth provider using your Clerk JWT issuer domain

### 3. Upstash Redis (Socket.IO Pub/Sub)
1. Create an account at [upstash.com](https://upstash.com)
2. Create a Redis database (free tier)
3. From the database detail page, copy the **Redis URL** — it starts with `rediss://` (TLS)
4. Paste it as `UPSTASH_REDIS_URL` in `server/.env`

---

## Environment Variables

### Root project — `.env.local`

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
CLERK_JWT_ISSUER_DOMAIN=https://<your-instance>.clerk.accounts.dev
CLERK_WEBHOOK_SECRET=whsec_...

# Convex (auto-populated by `npx convex dev`)
NEXT_PUBLIC_CONVEX_URL=https://<your-project>.convex.cloud
CONVEX_DEPLOYMENT=dev:<your-project>
NEXT_PUBLIC_CONVEX_SITE_URL=https://<your-project>.convex.site
```

### Socket.IO server — `server/.env`

```env
PORT=3001
ALLOWED_ORIGIN=http://localhost:3000
CLERK_SECRET_KEY=sk_test_...          # same as above
UPSTASH_REDIS_URL=rediss://default:...@<host>.upstash.io:6379
```

> Neither `.env.local` nor `server/.env` should ever be committed to Git. Both are in `.gitignore`.

---

## Local Development Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd On-Point

# 2. Install frontend dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local   # then fill in your values

# 4. Start Convex dev server (keep this running in its own terminal)
npx convex dev

# 5. Start the Next.js frontend (separate terminal)
npm run dev
# → http://localhost:3000

# 6. Set up Socket.IO server
cd server
npm install
# Create server/.env and fill in the values listed above

# 7. Start the Socket.IO server (separate terminal, from server/ directory)
npm run dev
# → http://localhost:3001
```

You need **three terminals** running simultaneously for full local dev:
- `npx convex dev` (Convex)
- `npm run dev` (Next.js frontend)
- `cd server && npm run dev` (Socket.IO server)

---

## Project Structure

```
On-Point/
├── app/                        # Next.js App Router pages
│   ├── (auth)/                 # Sign-in, sign-up pages
│   ├── onboarding/             # First-login workspace setup
│   ├── workspace/              # Workspace dashboard
│   ├── board/[boardId]/        # Board view (Kanban)
│   └── api/webhooks/clerk/     # Clerk webhook receiver
├── components/                 # Shared React components
│   ├── ui/                     # shadcn/ui components
│   ├── board/                  # Board, Column, Card components
│   └── providers/              # ConvexClerkProvider, etc.
├── convex/                     # Convex backend
│   ├── schema.ts               # Database schema
│   ├── auth.config.ts          # Clerk auth config for Convex
│   ├── users.ts                # User queries/mutations
│   ├── workspaces.ts           # Workspace queries/mutations
│   ├── boards.ts               # Board queries/mutations
│   ├── columns.ts              # Column queries/mutations
│   └── cards.ts                # Card queries/mutations
├── server/                     # Standalone Socket.IO server
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── redis.ts            # Upstash Redis adapter setup
│   │   ├── presence.ts         # In-memory presence store
│   │   ├── rateLimit.ts        # Redis-based rate limiter
│   │   ├── middleware/
│   │   │   └── auth.ts         # Clerk JWT verification middleware
│   │   └── handlers/
│   │       └── connection.ts   # All Socket.IO event handlers
│   └── package.json
├── doc/                        # Full project documentation
│   ├── IMPLEMENTATION_PLAN.md  # Step-by-step build plan
│   ├── PRD.md                  # Product requirements
│   ├── BP.md                   # Backend plan
│   ├── FP.md                   # Frontend plan
│   └── ...
└── CLAUDE.md                   # AI assistant instructions
```

---

## Build Progress

| Step | Feature | Status |
|------|---------|--------|
| 1 | Project Foundation (Next.js + Convex + Clerk setup) | Complete |
| 2 | Authentication & User Sync | Complete |
| 3 | Workspace Layer | Complete |
| 4 | Backend Data Layer (Boards, Columns, Cards) | Complete |
| 5 | Board View — Static UI | Complete |
| 6 | Card Modal | Complete |
| 7 | Drag-and-Drop | Complete |
| 8 | Socket.IO Server + Upstash Redis | Complete |
| 9 | Real-Time Frontend Integration | Up next |
| 10 | Presence | Planned |
| 11 | Comments & @Mentions | Planned |
| 12 | Notifications | Planned |

---

## Documentation

Full planning docs live in the `doc/` directory:

| File | Contents |
|------|---------|
| `doc/IMPLEMENTATION_PLAN.md` | Step-by-step build checklist |
| `doc/PRD.md` | Full product requirements |
| `doc/BP.md` | Backend API design and database schema |
| `doc/FP.md` | Frontend component tree and state management |
| `doc/TOOLS_AND_TECHNOLOGIES.md` | Every tech choice explained with rationale |
| `doc/UI_UX_SPEC.md` | Design system and UI specifications |
| `doc/TESTING_PLAN.md` | Testing strategy |
| `doc/DEPLOYMENT_PLAN.md` | Deployment pipeline |

---

## License

MIT
