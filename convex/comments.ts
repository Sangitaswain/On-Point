import { v, ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
import { assertBoardPermission } from './lib/permissions'
import { writeActivityLog } from './lib/activityLog'
import { extractMentionedUserIds } from './lib/mentions'
import { createNotification } from './lib/notifications'
import { Id } from './_generated/dataModel'

export const listByCard = query({
  args: { cardId: v.id('cards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const card = await ctx.db.get(args.cardId)
    if (!card) throw new ConvexError({ code: 'NOT_FOUND' })
    await assertBoardPermission(ctx, card.boardId, user._id, 'view')

    const comments = await ctx.db
      .query('comments')
      .withIndex('by_card', (q) => q.eq('cardId', args.cardId))
      .collect()

    // Hydrate author info
    const hydrated = await Promise.all(
      comments.map(async (c) => {
        const author = await ctx.db.get(c.authorId)
        return {
          ...c,
          authorName: author?.name ?? 'Unknown',
          authorAvatarUrl: author?.avatarUrl,
        }
      })
    )

    return hydrated
  },
})

export const createComment = mutation({
  args: { cardId: v.id('cards'), body: v.any() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const card = await ctx.db.get(args.cardId)
    if (!card) throw new ConvexError({ code: 'NOT_FOUND' })
    await assertBoardPermission(ctx, card.boardId, user._id, 'comment')

    await ctx.db.insert('comments', {
      cardId: args.cardId,
      boardId: card.boardId,
      authorId: user._id,
      body: args.body,
    })

    // Fire MENTIONED notifications — only for actual workspace members
    const board = await ctx.db.get(card.boardId)
    const wsMembers = board
      ? await ctx.db
          .query('workspaceMembers')
          .withIndex('by_workspace', (q) => q.eq('workspaceId', board.workspaceId))
          .collect()
      : []
    const memberIdSet = new Set(wsMembers.map((m) => m.userId as string))
    const mentionedIds = extractMentionedUserIds(args.body).filter((id) => memberIdSet.has(id))
    for (const uid of mentionedIds) {
      await createNotification(ctx, {
        userId: uid as Id<'users'>,
        type: 'MENTIONED',
        cardId: args.cardId,
        boardId: card.boardId,
        actorId: user._id,
      })
    }

    await writeActivityLog(ctx, {
      boardId: card.boardId,
      actorId: user._id,
      actionType: 'COMMENT_ADDED',
      entityType: 'comment',
      entityId: args.cardId as string,
      metadata: { cardTitle: card.title },
    })
  },
})

export const updateComment = mutation({
  args: { commentId: v.id('comments'), body: v.any() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const comment = await ctx.db.get(args.commentId)
    if (!comment) throw new ConvexError({ code: 'NOT_FOUND' })
    await assertBoardPermission(ctx, comment.boardId, user._id, 'comment')
    if (comment.authorId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Can only edit own comments',
      })
    }
    await ctx.db.patch(args.commentId, { body: args.body, editedAt: Date.now() })
  },
})

export const deleteComment = mutation({
  args: { commentId: v.id('comments') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const comment = await ctx.db.get(args.commentId)
    if (!comment) throw new ConvexError({ code: 'NOT_FOUND' })

    // Author can delete own, or user with edit permission can delete any
    if (comment.authorId !== user._id) {
      await assertBoardPermission(ctx, comment.boardId, user._id, 'edit')
    }

    await ctx.db.delete(args.commentId)
  },
})
