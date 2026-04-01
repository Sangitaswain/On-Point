import { MutationCtx } from '../_generated/server'
import { Id } from '../_generated/dataModel'

export async function createNotification(
  ctx: MutationCtx,
  params: {
    userId: Id<'users'>
    type: 'ASSIGNED' | 'MENTIONED'
    cardId: Id<'cards'>
    boardId: Id<'boards'>
    actorId: Id<'users'>
  }
) {
  // Do not notify if actor === recipient
  if (params.userId === params.actorId) return

  await ctx.db.insert('notifications', {
    userId: params.userId,
    type: params.type,
    cardId: params.cardId,
    boardId: params.boardId,
    actorId: params.actorId,
    isRead: false,
  })
}
