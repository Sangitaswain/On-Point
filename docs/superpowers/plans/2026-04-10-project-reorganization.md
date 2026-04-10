# OnPoint Project Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoist all source code from `onpoint/` to the repo root so `npm`, `npx convex`, and `next` all run from one place, and fix the 4 broken items in the same pass.

**Architecture:** Copy each directory and file from `onpoint/` to the repo root. Create new `hooks/` dir and `app/(auth)/layout.tsx`. Fix `app/page.tsx`. Delete `convex/convex.config.ts`. Reinstall deps fresh at root. Verify everything boots. Then delete `onpoint/` and commit.

**Tech Stack:** Next.js 16.2.2 (App Router, TypeScript), Convex 1.34.1, Clerk 7, shadcn/ui, Tailwind CSS 4

**Working directory for all commands:** `C:\Users\DELL\OneDrive\Desktop\On-Point` (repo root)

---

## File Map

| Action | Path (relative to repo root) |
|--------|-------------------------------|
| Copy from `onpoint/` | `app/` |
| Copy from `onpoint/` | `components/` |
| Copy from `onpoint/` | `convex/` |
| Copy from `onpoint/` | `lib/` |
| Copy from `onpoint/` | `types/` |
| Copy from `onpoint/` | `public/` |
| Copy from `onpoint/` | `middleware.ts` |
| Copy from `onpoint/` | `package.json`, `package-lock.json` |
| Copy from `onpoint/` | `tsconfig.json`, `next.config.ts` |
| Copy from `onpoint/` | `postcss.config.mjs`, `eslint.config.mjs` |
| Copy from `onpoint/` | `components.json`, `skills-lock.json` |
| Copy from `onpoint/` | `.env.local` |
| Copy from `onpoint/` | `.agents/` (Convex skill files) |
| Create at root | `.gitignore` (merged from `onpoint/.gitignore`) |
| Update | `CLAUDE.md` (add `@AGENTS.md` + Convex AI section) |
| Copy from `onpoint/` | `AGENTS.md` |
| Create | `hooks/.gitkeep` |
| Create | `app/(auth)/layout.tsx` |
| Fix | `app/page.tsx` |
| Delete | `convex/convex.config.ts` |
| Reinstall | `node_modules/` (fresh at root) |
| Regenerate | `.claude/skills/` symlinks via `npx convex ai-files install` |
| Delete | `onpoint/` (after verification) |

---

## Task 1: Copy source directories to root

**Files:**
- Create: `app/` (copy from `onpoint/app/`)
- Create: `components/` (copy from `onpoint/components/`)
- Create: `convex/` (copy from `onpoint/convex/`)
- Create: `lib/` (copy from `onpoint/lib/`)
- Create: `types/` (copy from `onpoint/types/`)
- Create: `public/` (copy from `onpoint/public/`)

- [ ] **Step 1: Copy all source directories**

Run from `C:\Users\DELL\OneDrive\Desktop\On-Point`:
```bash
cp -r onpoint/app .
cp -r onpoint/components .
cp -r onpoint/convex .
cp -r onpoint/lib .
cp -r onpoint/types .
cp -r onpoint/public .
```

- [ ] **Step 2: Verify directories exist at root**

```bash
ls -d app components convex lib types public
```

Expected output:
```
app  components  convex  lib  public  types
```

---

## Task 2: Copy config and manifest files to root

**Files:**
- Create: `middleware.ts`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `components.json`
- Create: `skills-lock.json`
- Create: `.env.local`

- [ ] **Step 1: Copy all config files**

```bash
cp onpoint/middleware.ts .
cp onpoint/package.json .
cp onpoint/package-lock.json .
cp onpoint/tsconfig.json .
cp onpoint/next.config.ts .
cp onpoint/postcss.config.mjs .
cp onpoint/eslint.config.mjs .
cp onpoint/components.json .
cp onpoint/skills-lock.json .
cp onpoint/.env.local .
```

- [ ] **Step 2: Verify files exist at root**

```bash
ls middleware.ts package.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs components.json .env.local
```

Expected: all 8 files listed, no "No such file" errors.

---

## Task 3: Copy Convex agent skill files and AGENTS.md

**Files:**
- Create: `.agents/` (copy from `onpoint/.agents/`)
- Create: `AGENTS.md` (copy from `onpoint/AGENTS.md`)

The `.agents/` directory holds the actual Convex skill files. The `.claude/skills/` symlinks that point into it will be regenerated in Task 9.

- [ ] **Step 1: Copy .agents directory**

```bash
cp -r onpoint/.agents .
```

- [ ] **Step 2: Copy AGENTS.md**

```bash
cp onpoint/AGENTS.md .
```

- [ ] **Step 3: Verify**

```bash
ls .agents/skills/
```

Expected output (5 skill directories):
```
convex-create-component  convex-migration-helper  convex-performance-audit  convex-quickstart  convex-setup-auth
```

---

## Task 4: Create .gitignore at root

**Files:**
- Create: `.gitignore`

The `onpoint/.gitignore` works for a project at root. Copy it as-is — it already covers `node_modules`, `.next`, `.env*`, `*.tsbuildinfo`, `next-env.d.ts`, etc.

- [ ] **Step 1: Copy .gitignore to root**

```bash
cp onpoint/.gitignore .
```

- [ ] **Step 2: Verify .gitignore covers critical paths**

```bash
cat .gitignore
```

Confirm these lines are present:
- `/node_modules`
- `/.next/`
- `.env*`
- `next-env.d.ts`

---

## Task 5: Update root CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Add `@AGENTS.md` at the top (so Claude Code also reads AGENTS.md) and append the Convex AI section at the bottom.

- [ ] **Step 1: Prepend @AGENTS.md and append Convex AI section**

Open `CLAUDE.md` and make two changes:

**At the very top of the file, add this as the first line:**
```
@AGENTS.md
```

**At the very bottom of the file, add:**
```markdown

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
```

- [ ] **Step 2: Verify the first line**

```bash
head -1 CLAUDE.md
```

Expected output:
```
@AGENTS.md
```

- [ ] **Step 3: Verify convex-ai section exists**

```bash
grep "convex-ai-start" CLAUDE.md
```

Expected output:
```
<!-- convex-ai-start -->
```

---

## Task 6: Create hooks/ directory

**Files:**
- Create: `hooks/.gitkeep`

The `components.json` aliases `@/hooks` — shadcn CLI will write hook files here when you add new components. Without the directory, the CLI errors.

- [ ] **Step 1: Create hooks directory with a placeholder**

```bash
mkdir -p hooks && touch hooks/.gitkeep
```

- [ ] **Step 2: Verify**

```bash
ls hooks/
```

Expected output:
```
.gitkeep
```

---

## Task 7: Create app/(auth)/layout.tsx

**Files:**
- Create: `app/(auth)/layout.tsx`

This layout wraps the sign-in and sign-up pages. It centers the Clerk component cards on a neutral background. It does NOT include `ClerkProvider` (that's already in the root layout).

- [ ] **Step 1: Create the auth layout file**

Create `app/(auth)/layout.tsx` with this exact content:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify the file exists**

```bash
cat "app/(auth)/layout.tsx"
```

Expected: the content above printed to stdout.

---

## Task 8: Fix app/page.tsx

**Files:**
- Modify: `app/page.tsx`

The current file shows a static "OnPoint" heading. Replace it with smart redirect logic: authenticated users go to `/onboarding` (which redirects to their workspace); unauthenticated users go to `/sign-in`.

- [ ] **Step 1: Replace app/page.tsx**

Write this exact content to `app/page.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const { userId } = await auth()
  if (userId) {
    redirect('/onboarding')
  } else {
    redirect('/sign-in')
  }
}
```

- [ ] **Step 2: Verify**

```bash
cat app/page.tsx
```

Expected: the content above printed to stdout.

---

## Task 9: Delete convex/convex.config.ts

**Files:**
- Delete: `convex/convex.config.ts`

This file was created to work around an esbuild error that occurred when `node_modules` was empty. Now that deps will be installed fresh, the Convex CLI auto-generates a correct virtual config. Keeping the file adds noise without benefit.

- [ ] **Step 1: Delete the file**

```bash
rm convex/convex.config.ts
```

- [ ] **Step 2: Verify it's gone**

```bash
ls convex/convex.config.ts 2>&1
```

Expected output:
```
ls: cannot access 'convex/convex.config.ts': No such file or directory
```

---

## Task 10: Install dependencies at root

**Files:**
- Create: `node_modules/` (at root)

- [ ] **Step 1: Run npm install**

```bash
npm install
```

Expected: finishes with `added NNN packages` and no errors. The `node_modules/` directory appears at the repo root.

- [ ] **Step 2: Verify key packages installed**

```bash
ls node_modules | grep -E "^(next|convex|@clerk)$"
```

Expected output (all three present):
```
@clerk
convex
next
```

- [ ] **Step 3: Verify convex/server resolves**

```bash
node -e "import('convex/server').then(() => console.log('ok')).catch(e => console.error(e.message))"
```

Expected output:
```
ok
```

---

## Task 11: Verify npx convex dev runs clean

- [ ] **Step 1: Run convex dev in check mode**

```bash
npx convex dev --once
```

Expected: no esbuild errors, output ends with something like:
```
✔ 10 functions ready
```

If you see `Could not resolve "convex/server"` — stop. The `convex.config.ts` deletion in Task 9 must not have worked. Check `ls convex/convex.config.ts` and delete again if present.

---

## Task 12: Verify Next.js dev server starts

- [ ] **Step 1: Start the dev server and check for errors**

```bash
npm run dev -- --port 3001
```

Wait 10 seconds, then check if the server is running. Expected output includes:
```
▲ Next.js 16.x.x
- Local: http://localhost:3001
✓ Starting...
✓ Ready in Xs
```

No TypeScript errors. No missing module errors.

- [ ] **Step 2: Stop the dev server**

Press `Ctrl+C` to stop.

---

## Task 13: Regenerate Convex skill symlinks

**Files:**
- Create: `.claude/skills/` symlinks (Convex agent skills)

The `onpoint/.claude/skills/` directory had symlinks pointing to the old absolute path inside `onpoint/`. Those are broken now. Re-running `npx convex ai-files install` regenerates them pointing to the correct new location.

- [ ] **Step 1: Run convex ai-files install**

```bash
npx convex ai-files install
```

Expected output:
```
✔ Skills installed
```

- [ ] **Step 2: Verify symlinks point to correct location**

```bash
ls -la .claude/skills/
```

Expected: 5 symlinks, each pointing to `.agents/skills/<skill-name>/` (the new root-level path, NOT `onpoint/.agents/`).

- [ ] **Step 3: Confirm CLAUDE.md was not overwritten**

```bash
head -1 CLAUDE.md
```

Expected: `@AGENTS.md` (the line we added in Task 5). If it shows `# OnPoint` instead, the install command overwrote CLAUDE.md — re-apply Task 5 changes.

---

## Task 14: Delete onpoint/ directory

Only run this task after Tasks 11 and 12 both passed (convex dev and npm run dev both clean).

- [ ] **Step 1: Confirm source and destination match before deleting**

```bash
diff -rq --exclude="node_modules" --exclude=".next" --exclude="_generated" onpoint/app app/ && echo "app: identical"
diff -rq --exclude="node_modules" --exclude=".next" onpoint/components components/ && echo "components: identical"
diff -rq --exclude="node_modules" --exclude=".next" --exclude="_generated" --exclude="convex.config.ts" onpoint/convex convex/ && echo "convex: identical"
```

Expected: each line prints `<dir>: identical`. If any diff shows differences, investigate before proceeding.

- [ ] **Step 2: Delete the onpoint directory**

```bash
rm -rf onpoint/
```

- [ ] **Step 3: Verify it's gone**

```bash
ls -d onpoint 2>&1
```

Expected:
```
ls: cannot access 'onpoint': No such file or directory
```

---

## Task 15: Final git commit

- [ ] **Step 1: Check git status**

```bash
git status
```

Expected: large changeset — many new files added at root, `onpoint/` files deleted.

- [ ] **Step 2: Stage all changes**

```bash
git add -A
```

- [ ] **Step 3: Verify what's staged**

```bash
git diff --cached --stat | tail -5
```

Spot-check that `app/`, `components/`, `convex/`, `middleware.ts`, `package.json` appear as new files and `onpoint/` files appear as deleted.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore: hoist onpoint/ to repo root, fix 4 setup issues

- Move all source, config, and dotfiles from onpoint/ to repo root
- Add app/(auth)/layout.tsx (centered auth wrapper)
- Fix app/page.tsx to redirect / → /sign-in or /onboarding
- Delete convex/convex.config.ts (not needed, caused esbuild errors)
- Create hooks/ directory for shadcn CLI compatibility
- Merge .gitignore to root, update CLAUDE.md with Convex AI section
- clerk-nextjs/ kept as reference (delete separately after verification)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Verify commit**

```bash
git log --oneline -3
```

Expected: the new commit appears at the top.

---

## Verification Checklist

After all tasks complete, confirm:

- [ ] `ls package.json app/ convex/ middleware.ts .env.local` — all present at root
- [ ] `npm run dev` starts without errors on port 3000
- [ ] `npx convex dev --once` runs clean (no esbuild errors)
- [ ] `http://localhost:3000/` redirects to `/sign-in`
- [ ] `http://localhost:3000/sign-in` renders Clerk sign-in UI
- [ ] `http://localhost:3000/sign-in/sso-callback` returns 200 (not 404)
- [ ] `onpoint/` directory no longer exists
- [ ] `clerk-nextjs/` directory still exists (kept for reference)
