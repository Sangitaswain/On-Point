import { v, ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
import { assertBoardPermission } from './lib/permissions'

export const listByBoard = query({
  args: { boardId: v.id('boards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'view')

    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .order('asc')
      .take(100)

    return Promise.all(
      messages.map(async (m) => {
        const sender = await ctx.db.get(m.userId)
        return {
          ...m,
          senderName: sender?.name ?? 'Unknown',
          senderAvatarUrl: sender?.avatarUrl,
        }
      })
    )
  },
})

export const sendChatMessage = mutation({
  args: { boardId: v.id('boards'), body: v.string() },
  handler: async (ctx, args) => {
    const body = args.body.trim()
    if (!body) throw new ConvexError({ code: 'INVALID_INPUT' })

    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'view')

    await ctx.db.insert('chatMessages', {
      boardId: args.boardId,
      userId: user._id,
      body,
    })
  },
})
