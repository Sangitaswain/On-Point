@AGENTS.md

# OnPoint — Claude Code Instructions

## Project Description

OnPoint is a real-time, collaborative project management board. Teams organize work using a Kanban-style interface with live synchronization — every change is immediately visible to all team members. Built with Next.js (App Router), Convex (backend/database), Clerk (auth), Socket.IO (real-time), shadcn/ui, and Tailwind CSS.

## Documentation

All project documentation lives in the `doc/` directory. Read these files for full context:

| File | Purpose |
|------|---------|
| `doc/IMPLEMENTATION_PLAN.md` | Step-by-step build plan with checklists — **read this before starting any work** |
| `doc/PRD.md` | Product requirements and feature specs |
| `doc/BP.md` | Backend plan — API design, database schema, Convex functions |
| `doc/FP.md` | Frontend plan — component tree, pages, state management |
| `doc/TOOLS_AND_TECHNOLOGIES.md` | Tech stack decisions and rationale |
| `doc/API_INTEGRATION.md` | API integration details and external service contracts |
| `doc/SECURITY_AND_OPERATIONS.md` | Security policies, auth flows, operational guidelines |
| `doc/TESTING_PLAN.md` | Testing strategy, coverage targets, test types |
| `doc/UI_UX_SPEC.md` | UI/UX specifications and design system |
| `doc/DEPLOYMENT_PLAN.md` | Deployment pipeline, environments, rollback strategy |
| `doc/PHASE_STRATEGY.md` | Phase-by-phase delivery strategy |

## Before Starting Any Work

1. **Always read `doc/IMPLEMENTATION_PLAN.md` first** — find the current step (the first one not marked complete) and work on it.
2. **Read the Operational Rules section** in the implementation plan before every step. These are non-negotiable.
3. **Follow the step index sequentially** — do not skip steps or start the next step until all substeps in the current step are marked `[x]`.
4. **Mark progress** — check off each substep (`[x]`) as you complete it. Update the step status when all substeps are done.

## Key Rules

- **Security first** — sanitize inputs, validate auth at every access point, never expose secrets
- **Test everything** — no step is complete without tests
- **Consistent commits** — use `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `style:` prefixes
- **No sensitive data in logs or responses** — ever
- **Consistent API responses** — use a standard error/success format everywhere
- **Read before writing** — always read existing files before modifying them

## README Maintenance (from Step 9 onwards)

**Update `README.md` alongside every step, as part of completing that step.**

When a step is done:
1. Update the **Build Progress** table in README — change the step's status from `Planned` / `Up next` to `Complete` and advance the `Up next` marker to the next step.
2. If the step adds new features, add them to the **Features** section under the appropriate heading.
3. If the step introduces new environment variables, add them to the **Environment Variables** section.
4. If the step adds new files or directories that someone setting up the codebase needs to know about, update the **Project Structure** section.

The README is the first thing anyone clones the repo sees. Keep it accurate — a stale README is worse than no README.

## Tech Stack Quick Reference

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend/DB:** Convex
- **Auth:** Clerk
- **Real-time:** Socket.IO
- **Deployment:** Vercel

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
