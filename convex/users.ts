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
  args: {
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new ConvexError({ code: 'UNAUTHENTICATED' })

    // Prefer the name passed by the frontend Clerk SDK (always has full profile).
    // Fall back through JWT claims, then email prefix, then a generic placeholder.
    const derivedName =
      args.name?.trim() ||
      identity.name?.trim() ||
      [identity.givenName, identity.familyName].filter(Boolean).join(' ').trim() ||
      identity.email?.split('@')[0] ||
      'User'

    const avatarUrl =
      args.avatarUrl ?? (identity.pictureUrl as string | undefined) ?? undefined

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique()

    if (existing) {
      // Only update name when the JWT gave us a real name.
      // If derivedName fell all the way back to 'User', the JWT template
      // doesn't include name claims — preserve whatever the webhook stored.
      const patch: { name?: string; avatarUrl?: string } = {}
      if (derivedName !== 'User') patch.name = derivedName
      if (avatarUrl) patch.avatarUrl = avatarUrl
      if (Object.keys(patch).length > 0) await ctx.db.patch(existing._id, patch)
      return existing._id
    }

    return await ctx.db.insert('users', {
      clerkId: identity.subject,
      email: identity.email ?? '',
      name: derivedName,
      avatarUrl,
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
