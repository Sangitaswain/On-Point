import { v, ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'

// ─── Webhook-callable mutations ──────────────────────────────────────────────
// These are regular mutations (not internalMutation) so the Next.js webhook
// handler can invoke them via ConvexHttpClient. Security is enforced at the
// API route level through svix signature verification, not Convex auth.

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotent — return existing user if already created
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (existing) return existing._id

    return await ctx.db.insert('users', {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
    })
  },
})

export const updateUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' })

    await ctx.db.patch(user._id, {
      name: args.name,
      avatarUrl: args.avatarUrl,
    })
  },
})

// ─── On-demand user sync ─────────────────────────────────────────────────────
// Called from the frontend on every sign-in as a fallback for when the Clerk
// webhook hasn't fired yet (common in local dev where localhost isn't public).
// Idempotent — safe to call repeatedly.

export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new ConvexError({ code: 'UNAUTHENTICATED' })

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique()

    if (existing) {
      // Update name/avatar in case they changed
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        avatarUrl: (identity.pictureUrl as string | undefined) ?? existing.avatarUrl,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      clerkId: identity.subject,
      email: identity.email ?? '',
      name: identity.name ?? 'Unknown',
      avatarUrl: (identity.pictureUrl as string | undefined) ?? undefined,
    })
  },
})

// ─── Authenticated queries ───────────────────────────────────────────────────

// Query — get the current authenticated user's record
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await requireUser(ctx)
  },
})

// Query — get a user by ID
export const getById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await requireUser(ctx)
    return await ctx.db.get(args.userId)
  },
})
