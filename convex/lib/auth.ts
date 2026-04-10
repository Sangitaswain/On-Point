import { QueryCtx, MutationCtx } from '../_generated/server'
import { ConvexError } from 'convex/values'

// Called at the start of every authenticated mutation/query.
// Returns the internal user record or throws if not found.
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError({ code: 'UNAUTHENTICATED' })

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique()

  if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' })
  return user
}
