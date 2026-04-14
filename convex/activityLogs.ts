import { v } from 'convex/values'
import { query } from './_generated/server'
import { paginationOptsValidator } from 'convex/server'
import { requireUser } from './lib/auth'
import { assertBoardPermission } from './lib/permissions'

export const listByBoard = query({
  args: {
    boardId: v.id('boards'),
    actionType: v.optional(v.string()),
    actorId: v.optional(v.id('users')),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'view')

    let q

    if (args.actorId) {
      q = ctx.db
        .query('activityLogs')
        .withIndex('by_board_and_actor', (idx) =>
          idx.eq('boardId', args.boardId).eq('actorId', args.actorId!)
        )
        .order('desc')
    } else if (args.actionType) {
      q = ctx.db
        .query('activityLogs')
        .withIndex('by_board_and_action', (idx) =>
          idx.eq('boardId', args.boardId).eq('actionType', args.actionType!)
        )
        .order('desc')
    } else {
      q = ctx.db
        .query('activityLogs')
        .withIndex('by_board', (idx) => idx.eq('boardId', args.boardId))
        .order('desc')
    }

    const result = await q.paginate(args.paginationOpts)

    const hydratedPage = await Promise.all(
      result.page.map(async (entry) => {
        const actor = await ctx.db.get(entry.actorId)
        return {
          ...entry,
          actorName: actor?.name ?? 'Someone',
          actorAvatarUrl: actor?.avatarUrl,
        }
      })
    )

    return { ...result, page: hydratedPage }
  },
})
