# Project Reorganization Design
**Date:** 2026-04-10  
**Status:** Approved

## Problem

The On-Point repository has scattered structure:
- `onpoint/` subdirectory holds the entire Next.js app (wrong — git root should be the app root)
- `clerk-nextjs/` is a stray scaffold at the root (reference copy, to be deleted later)
- 4 broken/missing pieces inside `onpoint/` prevent the app from running cleanly

## Goal

Move `onpoint/` contents to the repo root so `package.json`, `app/`, `convex/`, and all tooling live directly at `On-Point/`. Fix all 4 broken items in the same pass.

## New Folder Structure

```
On-Point/                          ← git root = Next.js app root
│
├── app/
│   ├── (app)/                     ← authenticated app routes (Clerk-protected)
│   │   ├── layout.tsx
│   │   └── [workspaceSlug]/
│   │       ├── page.tsx
│   │       ├── settings/page.tsx
│   │       └── board/[boardId]/
│   │           ├── page.tsx
│   │           └── settings/page.tsx
│   ├── (auth)/                    ← public auth routes
│   │   ├── layout.tsx             ← NEW: centers sign-in/up cards
│   │   ├── sign-in/[[...rest]]/page.tsx
│   │   └── sign-up/[[...rest]]/page.tsx
│   ├── api/webhooks/clerk/route.ts
│   ├── invite/[token]/page.tsx
│   ├── onboarding/page.tsx
│   ├── layout.tsx                 ← root layout (ClerkProvider + ThemeProvider)
│   ├── page.tsx                   ← FIX: redirect to /sign-in
│   └── globals.css
│
├── components/
│   ├── board/, card/, column/
│   ├── layout/, workspace/
│   ├── providers/, ui/
│   └── loading-spinner.tsx
│
├── convex/
│   ├── schema.ts
│   ├── boards.ts, cards.ts, columns.ts, comments.ts, users.ts, workspaces.ts
│   ├── lib/
│   └── convex.config.ts           ← FIX: remove defineApp, use export default {}
│
├── hooks/                         ← NEW: empty dir for shadcn component hooks
├── lib/
├── public/
├── types/
│
├── doc/                           ← planning docs (untouched)
├── docs/                          ← superpowers specs (this file)
├── clerk-nextjs/                  ← reference scaffold (delete after verification)
│
├── .env.local
├── middleware.ts
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json
├── CLAUDE.md
└── AGENTS.md
```

## What Changes

### Files Moved (onpoint/ → root)
All source files from `onpoint/` are hoisted to the repo root:
- `app/`, `components/`, `convex/`, `lib/`, `types/`, `public/`
- `middleware.ts`, `package.json`, `tsconfig.json`, `next.config.ts`
- `postcss.config.mjs`, `eslint.config.mjs`, `components.json`
- `.env.local`, `.gitignore`, `AGENTS.md`, `skills-lock.json`

### Not Moved
- `doc/` — stays at root (already in correct place)
- `clerk-nextjs/` — kept as reference, deleted after Clerk verified working
- `onpoint/node_modules/` and `onpoint/.next/` — deleted; reinstalled fresh at root

### Created New
- `hooks/` — empty directory; shadcn CLI deposits hook files here
- `app/(auth)/layout.tsx` — wraps sign-in/up in a centered, minimal layout

### Fixed

| Item | Fix |
|------|-----|
| `convex/convex.config.ts` | Delete the file entirely — project doesn't use Convex Components. Convex auto-generates a virtual config that resolves correctly now that `node_modules` is installed. Keeping a hand-written file with `defineApp` adds noise without benefit. |
| `app/page.tsx` | Add `redirect('/sign-in')` from `next/navigation` so `/` doesn't show a dead static page |
| `app/(auth)/layout.tsx` | New file: centers the Clerk `<SignIn>` / `<SignUp>` cards on a neutral background |
| `hooks/` directory | Create empty directory so shadcn CLI doesn't error on `@/hooks` alias |

### Updated
- `CLAUDE.md` at root — remove references to `onpoint/` subdirectory, update paths to reflect new root-level structure

## Data Flow (unchanged)

```
Browser → Next.js middleware (Clerk auth check)
       → (auth) routes: sign-in/sign-up via Clerk
       → (app) routes: Convex queries/mutations via ConvexClerkProvider
       → Webhook: Clerk → /api/webhooks/clerk → Convex users table
```

## What Is NOT Changing

- All `@/` import paths (tsconfig paths alias maps to `./*` — still correct at new root)
- All Convex function signatures and schema
- All component code
- All route logic and middleware rules
- `.env.local` values (Convex URL, Clerk keys)

## Verification After Reorganization

1. `npm install` runs clean at root
2. `npx convex dev` runs without esbuild errors
3. `npm run dev` starts on port 3000
4. `/` redirects to `/sign-in`
5. `/sign-in` renders Clerk UI without 404 on sub-routes
6. Signing in redirects to `/onboarding` or workspace
