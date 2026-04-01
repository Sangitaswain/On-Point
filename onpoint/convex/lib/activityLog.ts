import { MutationCtx } from '../_generated/server'
import { Id } from '../_generated/dataModel'

/**
 * Action Types and Metadata:
 *
 * | actionType       | entityType | Metadata fields                              |
 * |-----------------|------------|----------------------------------------------|
 * | CARD_CREATED    | card       | { title }                                    |
 * | CARD_UPDATED    | card       | { changedFields: string[] }                  |
 * | CARD_MOVED      | card       | { title, fromColumnTitle, toColumnTitle }     |
 * | CARD_DELETED    | card       | { title }                                    |
 * | COLUMN_CREATED  | column     | { title }                                    |
 * | COLUMN_UPDATED  | column     | { previousTitle, newTitle }                  |
 * | COLUMN_DELETED  | column     | { title, cardCount }                         |
 * | COMMENT_ADDED   | comment    | { cardTitle }                                |
 * | CARD_ASSIGNED   | card       | { cardTitle, assigneeName }                  |
 */
export async function writeActivityLog(
  ctx: MutationCtx,
  params: {
    boardId: Id<'boards'>
    actorId: Id<'users'>
    actionType: string
    entityType: string
    entityId: string
    metadata?: Record<string, unknown>
  }
) {
  await ctx.db.insert('activityLogs', {
    boardId: params.boardId,
    actorId: params.actorId,
    actionType: params.actionType,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata ?? {},
  })
}
