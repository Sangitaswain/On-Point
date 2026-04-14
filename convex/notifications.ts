import { v, ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(50)

    // Hydrate actor name and card title
    return Promise.all(
      notifications.map(async (n) => {
        const actor = await ctx.db.get(n.actorId)
        const card = await ctx.db.get(n.cardId)
        return {
          ...n,
          actorName: actor?.name ?? 'Someone',
          cardTitle: card?.title ?? 'a card',
        }
      })
    )
  },
})

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return 0

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return 0

    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_and_read', (q) =>
        q.eq('userId', user._id).eq('isRead', false)
      )
      .take(100)

    return unread.length
  },
})

export const markAsRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const notification = await ctx.db.get(args.notificationId)
    if (!notification) throw new ConvexError({ code: 'NOT_FOUND' })
    if (notification.userId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN' })
    }
    await ctx.db.patch(args.notificationId, { isRead: true })
  },
})

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)

    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_and_read', (q) =>
        q.eq('userId', user._id).eq('isRead', false)
      )
      .take(100)

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })))
  },
})
