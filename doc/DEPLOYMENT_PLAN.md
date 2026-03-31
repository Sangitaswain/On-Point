# Deployment & CI/CD Plan: OnPoint

**Version 1.0 | March 2026**
**References:** IMPLEMENTATION_PLAN.md (Step 18) · SECURITY_AND_OPERATIONS.md · PHASE_STRATEGY.md

---

## Purpose

This document is the complete deployment reference for OnPoint. It covers every environment variable (where to get it, where to set it), the CI/CD pipeline, service-by-service configuration, monitoring setup, and rollback procedures.

Claude must reference this document during Step 18 of the implementation plan and during any deployment-related troubleshooting.

---

## Table of Contents

1. [Deployment Architecture](#1-deployment-architecture)
2. [Environment Variable Inventory](#2-environment-variable-inventory)
3. [Local Development Setup](#3-local-development-setup)
4. [CI/CD Pipeline — GitHub Actions](#4-cicd-pipeline--github-actions)
5. [Vercel — Next.js Frontend](#5-vercel--nextjs-frontend)
6. [Render — Socket.IO Server](#6-render--socketio-server)
7. [Convex — Production Deployment](#7-convex--production-deployment)
8. [Clerk — Production Configuration](#8-clerk--production-configuration)
9. [Upstash Redis — Production Configuration](#9-upstash-redis--production-configuration)
10. [Deployment Order & Dependency Chain](#10-deployment-order--dependency-chain)
11. [Post-Deployment Verification](#11-post-deployment-verification)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Rollback Procedures](#13-rollback-procedures)
14. [Environment Promotion Checklist](#14-environment-promotion-checklist)

---

## 1. Deployment Architecture

```
GitHub Repository (main branch)
│
├── Push to main
│   ├── GitHub Actions CI runs (lint, typecheck, test)
│   │
│   ├── Vercel auto-deploys Next.js frontend  ──→  https://onpoint.vercel.app
│   │
│   └── Render auto-deploys Socket.IO server  ──→  https://onpoint-server.onrender.com
│
├── Convex (deployed separately via CLI)       ──→  https://xxx.convex.cloud
│
├── Clerk (external service, no deployment)    ──→  https://clerk.com
│
└── Upstash Redis (external service)           ──→  redis.upstash.io
```

**Three things require explicit action to deploy — they are NOT auto-deployed:**
1. **Convex** — run `npx convex deploy` manually each time the schema or functions change
2. **Clerk webhook** — registered once in the Clerk dashboard, points to the Vercel URL
3. **Render environment variables** — updated in the Render dashboard when they change

---

## 2. Environment Variable Inventory

This is the complete, authoritative list of every environment variable in the project. No variable should exist that is not listed here.

### 2.1 Next.js Frontend (`.env.local` for dev, Vercel dashboard for production)

| Variable | Example Value | Public? | How to Get It |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_abc...` | ✅ Yes | Clerk dashboard → API Keys → Publishable key |
| `CLERK_SECRET_KEY` | `sk_test_xyz...` | ❌ No | Clerk dashboard → API Keys → Secret key |
| `CLERK_WEBHOOK_SECRET` | `whsec_abc...` | ❌ No | Clerk dashboard → Webhooks → signing secret for your endpoint |
| `NEXT_PUBLIC_CONVEX_URL` | `https://xxx.convex.cloud` | ✅ Yes | Convex dashboard → Settings → Deployment URL |
| `NEXT_PUBLIC_SOCKET_URL` | `https://onpoint-server.onrender.com` | ✅ Yes | Render dashboard → your service → public URL |

**`.env.local` template** (copy this, fill in values, never commit the file):
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
CLERK_SECRET_KEY=sk_test_
CLERK_WEBHOOK_SECRET=whsec_

# Convex
NEXT_PUBLIC_CONVEX_URL=https://

# Socket.IO server (Render)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
# ^ Change to Render URL after Step 8.8 deployment
```

### 2.2 Socket.IO Server (`server/.env` for dev, Render environment variables for production)

| Variable | Example Value | How to Get It |
|---|---|---|
| `CLERK_SECRET_KEY` | `sk_test_xyz...` | Same as above — Clerk dashboard |
| `UPSTASH_REDIS_URL` | `rediss://default:...@...upstash.io:6379` | Upstash dashboard → your DB → Connect → Node.js (ioredis) URL |
| `UPSTASH_REDIS_TOKEN` | (embedded in the URL above for ioredis) | — |
| `PORT` | `3001` | Set by Render automatically in production; set manually in `server/.env` for local |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | Set to `https://onpoint.vercel.app` in production |

**`server/.env` template** (copy this, fill in values, never commit):
```bash
PORT=3001
ALLOWED_ORIGIN=http://localhost:3000
CLERK_SECRET_KEY=sk_test_
UPSTASH_REDIS_URL=rediss://default:PASSWORD@HOST:PORT
```

### 2.3 Convex Backend (set via `npx convex env set` or Convex dashboard)

| Variable | Value | How to Set |
|---|---|---|
| `CLERK_ISSUER_URL` | `https://clerk.your-app.com` | Clerk dashboard → API Keys → Issuer URL section |

Set it with:
```bash
npx convex env set CLERK_ISSUER_URL https://your-issuer-url.clerk.accounts.dev
```

This is required for Convex to verify Clerk JWTs. It is set once and does not change.

### 2.4 Variable Cross-Reference Table

This table shows which services need which variables, to catch configuration gaps:

| Variable | Next.js (Vercel) | Socket.IO (Render) | Convex | Notes |
|---|---|---|---|---|
| `CLERK_PUBLISHABLE_KEY` | ✅ `NEXT_PUBLIC_` | ❌ | ❌ | Safe for browser |
| `CLERK_SECRET_KEY` | ✅ server-only | ✅ | ❌ | Never in NEXT_PUBLIC_ |
| `CLERK_WEBHOOK_SECRET` | ✅ server-only | ❌ | ❌ | Webhook route only |
| `CLERK_ISSUER_URL` | ❌ | ❌ | ✅ | Set in Convex dashboard |
| `CONVEX_URL` | ✅ `NEXT_PUBLIC_` | ❌ | ❌ | Client-side only |
| `SOCKET_URL` | ✅ `NEXT_PUBLIC_` | ❌ | ❌ | Client-side only |
| `UPSTASH_REDIS_URL` | ❌ | ✅ | ❌ | Never in Next.js |
| `ALLOWED_ORIGIN` | ❌ | ✅ | ❌ | Set to Vercel URL in prod |

---

## 3. Local Development Setup

Run through this checklist once before writing any code. Every item must be complete before Step 1 of the implementation plan begins.

### 3.1 Required Accounts

- [ ] **GitHub** — repository will be pushed here; CI/CD runs from here
- [ ] **Clerk** (clerk.com) — free account; create a new application
- [ ] **Convex** (convex.dev) — free account; install CLI: `npm install -g convex`
- [ ] **Upstash** (upstash.com) — free account; create a Redis database (select a region close to your Render region)
- [ ] **Render** (render.com) — free account; no credit card required
- [ ] **Vercel** (vercel.com) — free account; connect to GitHub during setup

### 3.2 Required Local Tools

```bash
# Verify Node.js version (must be 20 or higher)
node --version
# Expected: v20.x.x or v21.x.x or higher

# Verify npm
npm --version
# Expected: 10.x.x or higher

# Verify Git
git --version

# Install Convex CLI globally
npm install -g convex

# Verify Convex CLI
npx convex --version
```

### 3.3 Running Both Servers Locally

Two processes must run simultaneously during development:

**Terminal 1 — Next.js + Convex:**
```bash
cd onpoint
npx convex dev &   # starts Convex local dev server in background
npm run dev        # starts Next.js at localhost:3000
```

**Terminal 2 — Socket.IO server:**
```bash
cd onpoint/server
npm run dev        # starts Socket.IO at localhost:3001
```

With both running:
- Next.js frontend: `http://localhost:3000`
- Socket.IO server: `http://localhost:3001`
- Convex dashboard: opens automatically at `https://dashboard.convex.dev`

### 3.4 Clerk Local Webhook Testing

Clerk cannot send webhooks to `localhost` directly. Use the Clerk CLI to forward them:

```bash
# Install Clerk CLI (one-time)
npm install -g @clerk/clerk-cli

# Start the webhook forwarder (run alongside dev servers)
npx clerk webhooks listen --url http://localhost:3000/api/webhooks/clerk

# This prints a temporary webhook secret — add it to .env.local as CLERK_WEBHOOK_SECRET
```

Keep this running whenever you need to test user sign-up (Steps 2+).

---

## 4. CI/CD Pipeline — GitHub Actions

### 4.1 Pipeline Overview

Every push to any branch and every pull request runs the CI pipeline. Pushes to `main` additionally trigger Vercel and Render auto-deployment.

**Pipeline stages:**
1. `lint` — ESLint checks
2. `typecheck` — TypeScript compiler check (`tsc --noEmit`)
3. `test` — Jest unit tests
4. `build` — Next.js production build (confirms no build errors)

Stages run in parallel where possible. If any stage fails, the pipeline fails and the PR cannot be merged.

### 4.2 GitHub Actions Workflow

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    name: TypeScript
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --ci --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  build:
    name: Build Check
    runs-on: ubuntu-latest
    env:
      # Dummy values for build-time env var validation — not real secrets
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_dummy
      NEXT_PUBLIC_CONVEX_URL: https://dummy.convex.cloud
      NEXT_PUBLIC_SOCKET_URL: https://dummy.onrender.com
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

### 4.3 Branch Protection Rules (set in GitHub → Settings → Branches)

For the `main` branch:
- Require status checks to pass before merging: `lint`, `typecheck`, `test`, `build`
- Require branches to be up to date before merging
- Do not allow bypassing the above settings

### 4.4 Socket.IO Server CI

The server has its own CI in the same workflow file, triggered only when `server/` files change:

```yaml
  test-server:
    name: Socket.IO Server Tests
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'server/')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - working-directory: server
        run: npm ci
      - working-directory: server
        run: npm test
      - working-directory: server
        run: npm run build   # TypeScript compile check
```

### 4.5 Adding ESLint Configuration

**File:** `.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "next/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { "allow": ["error", "warn"] }]
  }
}
```

Add lint script to `package.json`:
```json
"scripts": {
  "lint": "next lint"
}
```

---

## 5. Vercel — Next.js Frontend

### 5.1 Project Setup (one-time)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import the GitHub repository `onpoint`
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `/` (the Next.js project root, not `server/`)
5. Build command: `npm run build` (default)
6. Output directory: `.next` (default)
7. Install command: `npm ci` (prefer over `npm install` for reproducible builds)

### 5.2 Environment Variables (Vercel Dashboard)

Navigate to: Project → Settings → Environment Variables

Add each variable. For each one, select which environments it applies to:

| Variable | Development | Preview | Production |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | ✅ | ✅ |
| `CLERK_SECRET_KEY` | ✅ | ✅ | ✅ |
| `CLERK_WEBHOOK_SECRET` | ❌ | ❌ | ✅ only |
| `NEXT_PUBLIC_CONVEX_URL` | ✅ (dev URL) | ✅ (dev URL) | ✅ (prod URL) |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | ✅ | ✅ |

**Note on `NEXT_PUBLIC_CONVEX_URL`:** Use the development Convex deployment URL for Preview deployments. Use the production Convex deployment URL (from `npx convex deploy`) for Production.

### 5.3 Vercel Project Settings

**General:**
- Node.js version: 20.x
- Framework: Next.js

**Git:**
- Production branch: `main`
- Auto-deploy: enabled (every push to `main` triggers a new deployment)

**Domains:**
- Vercel assigns a default URL: `onpoint-xxx.vercel.app`
- For a custom domain (optional for v1): add under Project → Settings → Domains

### 5.4 Vercel Deployment Triggers

| Trigger | Result |
|---|---|
| Push to `main` | New production deployment |
| Push to any other branch | Preview deployment at `onpoint-git-branchname.vercel.app` |
| Pull request opened | Preview deployment (URL posted as a PR comment) |
| Manual redeploy | Available in Vercel dashboard → Deployments → Redeploy |

### 5.5 Checking a Vercel Deployment

After a push to `main`:
1. Go to Vercel dashboard → your project → Deployments tab
2. Click the latest deployment
3. Check the build log for errors
4. Click "Visit" to open the deployed URL
5. Open browser console — look for errors or failed network requests

**Common Vercel build failures:**

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module 'convex/...'` | Convex generated files missing | Run `npx convex dev` locally first to generate `convex/_generated/` |
| `Type error: ...` | TypeScript errors | Run `npx tsc --noEmit` locally and fix all errors |
| `Environment variable ... is not defined` | Missing env var in Vercel | Add it in Project → Settings → Environment Variables |
| `Module not found: Can't resolve '@/...'` | Path alias not configured | Check `tsconfig.json` has `baseUrl` and `paths` configured |

---

## 6. Render — Socket.IO Server

### 6.1 Service Setup (one-time)

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect the GitHub repository
3. Configuration:
   - **Name:** `onpoint-server`
   - **Root directory:** `server` (the Socket.IO project subfolder)
   - **Environment:** Node
   - **Build command:** `npm install && npm run build`
   - **Start command:** `node dist/index.js`
   - **Instance type:** Free

### 6.2 Environment Variables (Render Dashboard)

Navigate to: your service → Environment → Environment Variables

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `CLERK_SECRET_KEY` | (from Clerk dashboard) |
| `UPSTASH_REDIS_URL` | (from Upstash dashboard — starts with `rediss://`) |
| `ALLOWED_ORIGIN` | `https://onpoint.vercel.app` (your Vercel URL) |

**Note:** `PORT` is automatically set by Render. Do not set it manually.

### 6.3 Render Free Tier Behavior

**Critical limitation:** Render's free tier **spins down after 15 minutes of inactivity.** The first WebSocket connection after a spin-down will take 30–60 seconds to respond (cold start).

**Impact on OnPoint:**
- First user to open the app after a period of inactivity will experience a slow real-time connection
- Once warmed up, subsequent connections are fast
- This is acceptable for a portfolio/demo project

**Mitigation (optional):** Use a free uptime monitoring service (e.g., UptimeRobot) to ping the Render service URL every 10 minutes, preventing spin-down during active demo periods.

### 6.4 Getting the Render Service URL

After the first deployment:
1. Go to Render dashboard → your service
2. The public URL is shown at the top: `https://onpoint-server.onrender.com`
3. Copy this URL
4. Add it to:
   - `NEXT_PUBLIC_SOCKET_URL` in `.env.local` (local development against production socket server)
   - `NEXT_PUBLIC_SOCKET_URL` in Vercel environment variables (production frontend)

### 6.5 Render Auto-Deploy

By default, Render auto-deploys when changes are pushed to the connected GitHub branch. Since the server lives in a `server/` subdirectory:
- Configure Render to watch only the `server/` path for changes
- Render dashboard → your service → Settings → Auto-Deploy → Root Directory: `server/`

### 6.6 Checking a Render Deployment

1. Go to Render dashboard → your service → Logs tab
2. Expected startup logs:
   ```
   [Redis] Adapter connected
   Socket.IO server listening on port XXXX
   ```
3. If Redis fails to connect: socket server still starts but logs a Redis error
4. Test the service is alive: `curl https://onpoint-server.onrender.com/`

---

## 7. Convex — Production Deployment

### 7.1 Development vs. Production Deployments

Convex creates two deployments automatically:
- **Development** (`npx convex dev`): a personal dev deployment, used while coding locally
- **Production** (`npx convex deploy`): the live deployment used by the deployed Vercel app

The `NEXT_PUBLIC_CONVEX_URL` in Vercel must point to the **production** deployment URL.

### 7.2 Deploying to Production

```bash
# From the project root (not the server/ folder):
npx convex deploy
```

This command:
1. Compiles all TypeScript Convex functions
2. Validates the schema
3. Pushes to the production Convex deployment
4. Outputs the production deployment URL

**When to run `npx convex deploy`:**
- After any change to `convex/schema.ts`
- After any change to any file in `convex/`
- Before and after Step 18 deployment smoke test

### 7.3 Setting Convex Environment Variables for Production

```bash
# Set the Clerk issuer URL (one-time setup):
npx convex env set CLERK_ISSUER_URL https://your-issuer.clerk.accounts.dev --prod

# Verify it was set:
npx convex env list --prod
```

### 7.4 Convex Dashboard — Production

Access the production dashboard at: `https://dashboard.convex.dev` → select your project → switch to "Production" deployment.

Use the production dashboard to:
- Monitor function execution logs
- Inspect table data
- Run ad-hoc functions for debugging
- View rate limit and usage metrics

### 7.5 Convex Schema Migration Strategy

Convex handles schema changes automatically — there are no migration scripts. When `npx convex deploy` runs:
- New tables are created
- New fields on existing tables become available (with `v.optional()` for backwards compatibility)
- Removed fields are ignored (data remains in existing documents but is not typed)
- Removed tables are NOT automatically deleted — drop them manually via the dashboard if needed

**Rule for schema changes:** Always add new fields as `v.optional()` first. Make them required in a later deployment once all existing documents have been backfilled.

---

## 8. Clerk — Production Configuration

### 8.1 Switching to Production Instance

Clerk has two instances per application: **Development** and **Production**.

Development instance:
- Uses `pk_test_` keys
- Sends webhooks to `localhost` (via CLI forwarder)
- Email verification is relaxed

Production instance:
- Uses `pk_live_` keys
- Sends webhooks to the real Vercel URL
- Stricter email verification

**How to switch:**
1. Clerk dashboard → your application → switch from "Development" to "Production" in the top dropdown
2. Copy the new `pk_live_` publishable key and `sk_live_` secret key
3. Update Vercel environment variables with the live keys
4. Update `server/` Render environment variables with `sk_live_`

### 8.2 Registering the Webhook Endpoint

In the Clerk dashboard (production instance):

1. Webhooks → Add Endpoint
2. URL: `https://onpoint.vercel.app/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`
4. Click "Create"
5. Copy the **Signing Secret** (`whsec_...`)
6. Add it to Vercel as `CLERK_WEBHOOK_SECRET`
7. Redeploy Vercel (the new env var takes effect)

### 8.3 Testing the Webhook

From the Clerk dashboard → Webhooks → your endpoint → "Send example event":
1. Select `user.created`
2. Click "Send test event"
3. Expected: `200 OK` response
4. Check Convex production dashboard → Data → `users` table for the test user

If the response is `400`: the signature verification is failing. Confirm the `CLERK_WEBHOOK_SECRET` in Vercel matches the signing secret shown in the Clerk webhook dashboard.

### 8.4 OAuth (Google) Production Setup

For Google OAuth to work in production:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create an OAuth 2.0 credential
3. Authorized redirect URIs: add your Clerk production redirect URL (shown in Clerk dashboard → Google OAuth setup guide)
4. Copy the Client ID and Client Secret into Clerk dashboard → Social Connections → Google

Clerk provides a step-by-step guide in their dashboard for this setup.

---

## 9. Upstash Redis — Production Configuration

### 9.1 Creating a Redis Database

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create Database → name it `onpoint-redis`
3. Region: choose the region closest to your Render region (reduces latency)
   - If Render service is on US-East: choose `us-east-1`
4. Type: Regional (free)
5. Click "Create"

### 9.2 Getting the Connection URL

On the database page:
1. Click "Connect"
2. Select "Node.js (ioredis)"
3. Copy the full connection string: `rediss://default:PASSWORD@HOST:PORT`

This is your `UPSTASH_REDIS_URL`. Add it to:
- `server/.env` for local development
- Render environment variables for production

### 9.3 Verifying the Connection

```bash
# From server/ folder with .env loaded:
node -e "
const Redis = require('ioredis');
const r = new Redis(process.env.UPSTASH_REDIS_URL, { tls: { rejectUnauthorized: false } });
r.ping().then(res => { console.log('Redis connected:', res); r.disconnect(); });
"
# Expected output: Redis connected: PONG
```

---

## 10. Deployment Order & Dependency Chain

Services have dependencies on each other's URLs. Deploy in this exact order to avoid circular dependency issues:

```
Step 1: Create Clerk production instance → get pk_live_ and sk_live_ keys
   ↓
Step 2: Deploy Convex to production (npx convex deploy)
        Set CLERK_ISSUER_URL in Convex
        → get NEXT_PUBLIC_CONVEX_URL (production)
   ↓
Step 3: Deploy Socket.IO server to Render
        Set CLERK_SECRET_KEY, UPSTASH_REDIS_URL
        Set ALLOWED_ORIGIN to "" (placeholder — update in step 5)
        → get Render service URL
   ↓
Step 4: Deploy Next.js to Vercel
        Set all env vars including NEXT_PUBLIC_SOCKET_URL from Step 3
        Set NEXT_PUBLIC_CONVEX_URL from Step 2
        → get Vercel production URL (e.g., onpoint.vercel.app)
   ↓
Step 5: Update Render environment variable ALLOWED_ORIGIN = https://onpoint.vercel.app
        Redeploy Render service
   ↓
Step 6: Register Clerk webhook pointing to Vercel URL from Step 4
        → get CLERK_WEBHOOK_SECRET
        Update Vercel env var CLERK_WEBHOOK_SECRET
        Redeploy Vercel
   ↓
Step 7: Run post-deployment verification checklist
```

---

## 11. Post-Deployment Verification

Run through this checklist after every production deployment. A deployment is not complete until all items pass.

### 11.1 Service Health Checks

```bash
# 1. Vercel — frontend loads
curl -I https://onpoint.vercel.app
# Expected: HTTP/2 200

# 2. Render — Socket.IO server responds
curl -I https://onpoint-server.onrender.com
# Expected: any HTTP response (200, 404) — confirms server is running

# 3. Convex — functions deployed
npx convex dashboard
# Open production dashboard → Functions tab → confirm all functions listed
```

### 11.2 Authentication Flow

- [ ] Visit `https://onpoint.vercel.app`
- [ ] Redirect to `/sign-in` (not a blank page)
- [ ] Sign up with email — confirm user appears in Convex production `users` table
- [ ] Sign in with Google — confirm it works (requires Google OAuth setup)
- [ ] Onboarding page loads after first sign-in

### 11.3 WebSocket Connection

- [ ] Open browser DevTools → Network → WS tab
- [ ] Sign in and navigate to a board
- [ ] Confirm a WebSocket connection appears to the Render URL
- [ ] No CORS errors in the console

### 11.4 Real-Time Verification (Two Browsers)

- [ ] Open the board in two browsers
- [ ] Move a card in one browser
- [ ] Confirm it moves in the other browser without refresh

### 11.5 Webhook Verification

- [ ] Sign up a new user
- [ ] Check Convex production dashboard → `users` table
- [ ] Confirm the new user's record appears within 5 seconds

---

## 12. Monitoring & Observability

### 12.1 Vercel Analytics

Vercel provides built-in analytics at zero cost:
- Page views and visitor counts
- Core Web Vitals (LCP, FID, CLS) — useful for identifying performance issues
- Enable: Vercel dashboard → your project → Analytics tab → Enable

### 12.2 Vercel Function Logs

All Next.js API route executions (including the webhook handler) are logged:
- Vercel dashboard → your project → Logs tab
- Filter by `/api/webhooks/clerk` to see webhook delivery logs

### 12.3 Render Logs

All Socket.IO server logs are available in real time:
- Render dashboard → your service → Logs tab
- Useful for: seeing auth failures, Redis errors, event handler errors

**Key log patterns to monitor:**

| Log | Meaning |
|---|---|
| `[Auth] INVALID_TOKEN from socket xxx` | An invalid JWT tried to connect — normal if occasional |
| `[Rate limit] User xxx exceeded limit` | A user is sending events too fast |
| `[Redis pub error]` | Redis connection issue — investigate Upstash |
| `Socket.IO server listening on port xxx` | Server started successfully |

### 12.4 Convex Dashboard Monitoring

The Convex dashboard provides:
- Function execution logs (all mutations and queries, with duration and errors)
- Data viewer (inspect any table)
- Usage metrics (calls, reads, writes per day)

Check weekly: Convex dashboard → your project → Logs → filter for `Error` level.

### 12.5 Upstash Redis Monitoring

Upstash dashboard shows:
- Commands per day (compare to free tier limit of 10,000)
- Latency metrics
- Error rates

If approaching 10,000 commands/day: audit the rate limiting logic — it fires on every event. Consider reducing event frequency before upgrading.

### 12.6 Clerk Dashboard Monitoring

Clerk dashboard shows:
- Monthly Active Users (compare to free tier limit of 10,000)
- Sign-in/sign-up events
- Webhook delivery log (success/failure per event)

---

## 13. Rollback Procedures

### 13.1 Rolling Back the Next.js Frontend (Vercel)

Vercel keeps a history of all deployments:
1. Vercel dashboard → your project → Deployments tab
2. Find the last known-good deployment
3. Click the three-dot menu → "Promote to Production"
4. The previous deployment becomes live immediately (no rebuild required)

Time to roll back: under 30 seconds.

### 13.2 Rolling Back the Socket.IO Server (Render)

Render also keeps deployment history:
1. Render dashboard → your service → Deploys tab
2. Find the last known-good deploy
3. Click "Redeploy"
4. Wait for the service to restart (~1–2 minutes on free tier)

### 13.3 Rolling Back Convex Functions

Convex does not have a one-click rollback for functions. To roll back:
```bash
git checkout <previous-commit-hash> -- convex/
npx convex deploy
git checkout main -- convex/
```
This reverts only the `convex/` directory to the previous state and redeploys.

**Important:** If the schema was changed in the rolled-back commit, be careful — removing a field from the schema does not delete existing data, but adding a required field that existing documents don't have will cause type errors.

### 13.4 Rolling Back Clerk Webhooks

Clerk webhooks cannot be "rolled back" — they are configuration, not deployments. If a webhook endpoint is broken:
1. Clerk dashboard → Webhooks → your endpoint
2. You can disable the endpoint temporarily while fixing the issue
3. Clerk retries failed webhooks for up to 5 days — once the endpoint is fixed, missed events are delivered

---

## 14. Environment Promotion Checklist

Use this checklist before promoting code from development to production (i.e., before merging to `main` and triggering a production deployment).

### 14.1 Code Checks

- [ ] `npx tsc --noEmit` exits with 0 errors
- [ ] `npm run lint` exits with 0 errors
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — production build succeeds

### 14.2 Security Checks

- [ ] `git diff --staged` reviewed — no secrets in any committed file
- [ ] No `NEXT_PUBLIC_` prefix on any secret variable
- [ ] No `console.log` statements that print JWTs, passwords, or full user objects
- [ ] No `dangerouslySetInnerHTML` added outside of Tiptap output rendering
- [ ] CORS configuration still set to exact origin (not `"*"`)

### 14.3 Environment Variable Checks

- [ ] All variables in the inventory table (section 2) are set in Vercel
- [ ] All server variables are set in Render
- [ ] Convex environment variables are set via `npx convex env list --prod`
- [ ] `ALLOWED_ORIGIN` on Render is set to the correct Vercel URL (not localhost)

### 14.4 Data Integrity Checks

- [ ] If schema changed: `npx convex deploy` has been run for production
- [ ] No new required fields added to existing tables without migration strategy
- [ ] Activity log mutations are still append-only (no `patch`/`delete`)

### 14.5 Post-Deployment Smoke Test

- [ ] New user sign-up creates a Convex user record
- [ ] Board loads with all columns and cards
- [ ] Real-time card move works across two browsers
- [ ] WebSocket connects without CORS errors
- [ ] No errors in browser console during normal navigation

---

## 15. Configuration Files

These are the exact configuration files required in the repository. Copy these verbatim and fill in the placeholder values.

### 15.1 `tsconfig.json` (root — Next.js app)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "server"]
}
```

Notes:
- `strict: true` is required — no implicit any, no unsafe assignments
- `"server"` is excluded so the root `tsc` check does not typecheck the Socket.IO server
- `paths: { "@/*": ["./*"] }` enables `@/components/...` absolute imports

### 15.2 `tsconfig.json` (server/)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Notes:
- `module: "CommonJS"` because the Socket.IO server runs in Node.js (not bundled by Next.js)
- `outDir: "dist"` — compiled output for Render deployment
- The start command on Render: `node dist/index.js` (after `npm run build` which runs `tsc`)

### 15.3 `next.config.ts`

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',   // Clerk-hosted user avatars
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',  // Google OAuth avatars
      },
    ],
  },
}

export default nextConfig
```

Notes:
- `images.remotePatterns` is required for `next/image` to render Clerk and Google avatars
- No `experimental` flags needed for App Router in Next.js 14+
- Do NOT add `output: 'export'` — OnPoint uses dynamic routes and API routes

### 15.4 `.gitignore`

```
# Dependencies
node_modules/
server/node_modules/

# Build outputs
.next/
server/dist/

# Environment variables — NEVER commit these
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
server/.env

# Convex generated files (regenerated by `npx convex dev`)
convex/_generated/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Vercel
.vercel
```

Critical rules:
- `.env.local` and `server/.env` must NEVER be committed
- `convex/_generated/` is regenerated on every `npx convex dev` — do not commit
- `server/dist/` is the compiled output — Render builds it during deployment, not pre-committed

### 15.5 `server/render.yaml`

This file configures the Render deployment for the Socket.IO server. Place it at `server/render.yaml`.

```yaml
services:
  - type: web
    name: onpoint-server
    env: node
    region: oregon
    plan: free
    rootDir: server
    buildCommand: npm install && npm run build
    startCommand: node dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: CLERK_SECRET_KEY
        sync: false
      - key: CLERK_PUBLISHABLE_KEY
        sync: false
      - key: UPSTASH_REDIS_REST_URL
        sync: false
      - key: UPSTASH_REDIS_REST_TOKEN
        sync: false
      - key: ALLOWED_ORIGIN
        sync: false
    healthCheckPath: /health
```

Notes:
- `sync: false` means the value must be set manually in the Render dashboard (not auto-synced from a secret store)
- `rootDir: server` tells Render to run all commands inside the `server/` directory
- `healthCheckPath: /health` — the Socket.IO server must expose a `GET /health` route that returns `200 OK`
- Add this minimal health endpoint to `server/src/index.ts`:
  ```typescript
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
  ```
- `region: oregon` — free tier is available in Oregon (us-west-2); change if needed

---

## 16. Troubleshooting Guide

### 16.1 Vercel Build Failures

**Error:** `Type error: ...` during `next build`
- Run `npx tsc --noEmit` locally first to see the full error
- Common cause: a Convex-generated type changed after `npx convex dev` — regenerate and re-run

**Error:** `Module not found: Can't resolve '@/...'`
- Check `tsconfig.json` has `"paths": { "@/*": ["./*"] }`
- Check `next.config.ts` does NOT override module resolution in a conflicting way

**Error:** `Environment variable ... is not defined`
- The variable is missing from Vercel's environment variable settings
- Check section 2 — all 5 Next.js variables must be set
- Remember: Vercel distinguishes Development / Preview / Production — set for all three

**Error:** `next/image` domain not allowed
- Add the hostname to `remotePatterns` in `next.config.ts` (see section 15.3)

### 16.2 Render Cold Start Issues

**Symptom:** WebSocket connection fails after a period of inactivity (free tier sleeps after 15 minutes)
- This is expected on Render's free tier — the first request after sleep takes ~30 seconds
- Mitigation: The Socket.IO client's `reconnection: true` with exponential backoff handles this automatically
- The UI should show a "Reconnecting…" indicator during the reconnection period

**Error:** `EADDRINUSE: address already in use`
- Render killed the previous process but the port wasn't released
- This resolves itself on the next deploy — Render restarts the process cleanly

**Error:** Build fails: `npm: not found` or Node version mismatch
- Add `engines` to `server/package.json`:
  ```json
  "engines": { "node": ">=20.0.0" }
  ```

### 16.3 Upstash Redis / TLS Errors

**Error:** `Error: connect ECONNREFUSED` or `ECONNRESET`
- Ensure the Redis URL uses `rediss://` (with double-s) not `redis://`
- The `tls: { rejectUnauthorized: false }` option is required for Upstash

**Error:** `ReplyError: WRONGTYPE`
- A key in Redis has the wrong type — this happens if a key was manually set to a string and the adapter expects a hash
- Fix: `redis-cli DEL <key>` or flush the Redis database from the Upstash dashboard

**Error:** Rate limiting not working (all events pass)
- Check: `UPSTASH_REDIS_REST_URL` is set correctly in the server environment
- Check: the Redis client is initialized before the auth middleware runs

### 16.4 Clerk Webhook Failures

**Error:** Webhook returns `400 Bad Request` — "Error verifying webhook signature"
- The `CLERK_WEBHOOK_SECRET` is wrong or expired
- In Clerk dashboard → Webhooks → your endpoint → copy the Signing Secret
- Make sure the raw request body (not parsed JSON) is passed to `wh.verify()`

**Error:** Webhook returns `400` — "No svix headers"
- The request body is being parsed by Next.js middleware before reaching the route handler
- In `app/api/webhooks/clerk/route.ts`, use `await req.text()` (not `req.json()`) to get raw body:
  ```typescript
  const rawBody = await req.text()
  const event = wh.verify(rawBody, {
    'svix-id': headers.get('svix-id')!,
    'svix-timestamp': headers.get('svix-timestamp')!,
    'svix-signature': headers.get('svix-signature')!,
  })
  ```

**Error:** `createUser` is never called — new user has no Convex record
- Check the Clerk dashboard → Webhooks → Recent deliveries — is the webhook failing?
- Check Vercel function logs for the `/api/webhooks/clerk` route
- Clerk retries for up to 5 days — once the endpoint is fixed, missed events are delivered

### 16.5 Convex JWKS / Auth Errors

**Error in Convex:** `Could not verify authentication: JWT issuer mismatch`
- The JWT template in Clerk is not configured with the correct issuer
- In Clerk dashboard → JWT Templates → convex → verify the `iss` matches your Clerk domain
- In Convex dashboard → Settings → Authentication → verify the Clerk domain is registered

**Error:** `getUserIdentity() returns null` even when user is signed in
- The Convex JWT template `convex` does not exist in Clerk — create it (see API_INTEGRATION.md section 10.4)
- The `audience` in the Clerk template must be `"convex"` exactly

**Error:** Schema validation error in production after deploying
- A field was renamed or type changed in `convex/schema.ts`
- Convex does not auto-migrate data — existing documents with old field shapes may fail validation
- Fix: run a one-time migration mutation that patches all affected documents to the new shape

### 16.6 CORS Errors (Socket.IO)

**Error in browser console:** `Access to XMLHttpRequest ... has been blocked by CORS policy`
- `ALLOWED_ORIGIN` on Render is not set to the exact Vercel URL
- Must match exactly — including `https://` and no trailing slash
- Correct: `ALLOWED_ORIGIN=https://onpoint.vercel.app`
- Wrong: `ALLOWED_ORIGIN=https://onpoint.vercel.app/` (trailing slash breaks it)
- Wrong: `ALLOWED_ORIGIN=*` (never use wildcard — it disables auth security)

**Error:** CORS works on first load but fails after redeployment
- Vercel preview deployments have different URLs (e.g., `onpoint-xyz.vercel.app`)
- For production, always use the stable custom domain or the canonical Vercel production URL
- Set `ALLOWED_ORIGIN` to the production URL only — previews connect to the local dev server

### 16.7 Local Development Checklist (Before First Deploy)

Run this checklist locally before opening the first PR:

- [ ] `npm install` in root and in `server/` both succeed
- [ ] `npx convex dev` starts without errors, schema is applied
- [ ] `npm run dev` starts Next.js on port 3000
- [ ] `cd server && npm run dev` starts Socket.IO server on port 3001
- [ ] Browser opens `http://localhost:3000` — no console errors
- [ ] Sign-up creates a Convex user record (check Convex dashboard → Data → users)
- [ ] WebSocket connects (Network tab → WS → see connection to `localhost:3001`)
- [ ] Create a workspace, create a board, create a column, create a card — all persist after refresh
- [ ] Open two tabs with the same board — card move in tab A appears in tab B instantly
- [ ] `npm run lint` → 0 errors
- [ ] `npx tsc --noEmit` → 0 errors

---

## 17. Monorepo Structure

OnPoint uses a **simple two-package monorepo** — not a monorepo tool like Turborepo or Nx. The structure is:

```
onpoint/                        ← root (Next.js app)
├── package.json                ← root package.json (Next.js dependencies)
├── server/                     ← Socket.IO server (separate Node.js process)
│   ├── package.json            ← server dependencies (socket.io, @clerk/backend, etc.)
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── convex/                     ← Convex backend functions (deployed to Convex cloud)
│   ├── schema.ts
│   ├── users.ts
│   └── ...
├── app/                        ← Next.js App Router
├── components/
├── types/                      ← Shared TypeScript types
│   └── index.ts
└── ...
```

### 17.1 Root `package.json` (Next.js app)

```json
{
  "name": "onpoint",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

The root `package.json` does NOT have a `workspaces` field — this is intentional. The server is a completely separate process with its own `node_modules`. They are not linked.

### 17.2 `server/package.json` (Socket.IO server)

```json
{
  "name": "onpoint-server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "socket.io": "^4.7.0",
    "express": "^4.18.0",
    "@clerk/backend": "^1.0.0",
    "@socket.io/redis-adapter": "^8.3.0",
    "@upstash/redis": "^1.28.0",
    "ioredis": "^5.3.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0"
  }
}
```

### 17.3 Shared Types Between App and Server

The `types/index.ts` file in the root is used by the Next.js app. The Socket.IO server does NOT import from the root `types/` directory — this would create a cross-package dependency.

**Strategy for shared types:**
- The `types/index.ts` socket event interfaces (Section 9 of API_INTEGRATION.md) are defined in the Next.js app
- The Socket.IO server (`server/src/`) has its own `types.ts` file that mirrors the same interfaces
- This duplication is intentional — it keeps the server fully decoupled from the Next.js app
- If the socket event payload shapes change, update both files

### 17.4 Running Both Servers in Development

Two terminal windows are required:

```bash
# Terminal 1 — Next.js + Convex
npx convex dev &   # starts Convex in background
npm run dev        # starts Next.js on :3000

# Terminal 2 — Socket.IO server
cd server
npm run dev        # starts Socket.IO on :3001 (tsx watch for hot-reload)
```

Or use a tool like `concurrently` in the root to start all three at once:
```bash
npx concurrently \
  "npx convex dev" \
  "npm run dev" \
  "cd server && npm run dev"
```

### 17.5 CI/CD Considerations for Monorepo

The GitHub Actions workflow (see section 4) runs from the root. For the Socket.IO server CI:
- `cd server && npm install && npm run build` verifies the server compiles cleanly
- The server is deployed separately to Render — Render reads `server/render.yaml` and runs `npm run build` in `server/`
- Vercel only deploys the root Next.js app — it ignores the `server/` directory entirely
