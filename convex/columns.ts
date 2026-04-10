import { v, ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
import { assertBoardPermission } from './lib/permissions'
import { writeActivityLog } from './lib/activityLog'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listByBoard = query({
  args: { boardId: v.id('boards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'view')

    const columns = await ctx.db
      .query('columns')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .collect()

    columns.sort((a, b) => a.orderIndex - b.orderIndex)
    return columns
  },
})

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createColumn = mutation({
  args: {
    boardId: v.id('boards'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'edit')

    // Compute next orderIndex
    const existingColumns = await ctx.db
      .query('columns')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .collect()

    let maxOrderIndex = 0
    for (const col of existingColumns) {
      if (col.orderIndex > maxOrderIndex) {
        maxOrderIndex = col.orderIndex
      }
    }
    const orderIndex = existingColumns.length === 0 ? 1000 : maxOrderIndex + 1000

    const columnId = await ctx.db.insert('columns', {
      boardId: args.boardId,
      title: args.title.trim(),
      orderIndex,
    })

    await writeActivityLog(ctx, {
      boardId: args.boardId,
      actorId: user._id,
      actionType: 'COLUMN_CREATED',
      entityType: 'column',
      entityId: columnId,
      metadata: { title: args.title.trim() },
    })

    return columnId
  },
})

export const updateColumn = mutation({
  args: {
    columnId: v.id('columns'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const column = await ctx.db.get(args.columnId)
    if (!column) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Column not found' })
    }

    await assertBoardPermission(ctx, column.boardId, user._id, 'edit')

    const previousTitle = column.title
    await ctx.db.patch(args.columnId, { title: args.title.trim() })

    await writeActivityLog(ctx, {
      boardId: column.boardId,
      actorId: user._id,
      actionType: 'COLUMN_UPDATED',
      entityType: 'column',
      entityId: args.columnId,
      metadata: { previousTitle, newTitle: args.title.trim() },
    })
  },
})

export const deleteColumn = mutation({
  args: {
    columnId: v.id('columns'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const column = await ctx.db.get(args.columnId)
    if (!column) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Column not found' })
    }

    await assertBoardPermission(ctx, column.boardId, user._id, 'edit')

    // Fetch all cards in this column
    const cards = await ctx.db
      .query('cards')
      .withIndex('by_column', (q) => q.eq('columnId', args.columnId))
      .collect()

    // Delete related data for each card
    for (const card of cards) {
      // Delete card labels
      const labels = await ctx.db
        .query('cardLabels')
        .withIndex('by_card', (q) => q.eq('cardId', card._id))
        .collect()
      for (const label of labels) {
        await ctx.db.delete(label._id)
      }

      // Delete comments
      const comments = await ctx.db
        .query('comments')
        .withIndex('by_card', (q) => q.eq('cardId', card._id))
        .collect()
      for (const comment of comments) {
        await ctx.db.delete(comment._id)
      }

      // Delete card history
      const history = await ctx.db
        .query('cardHistory')
        .withIndex('by_card', (q) => q.eq('cardId', card._id))
        .collect()
      for (const entry of history) {
        await ctx.db.delete(entry._id)
      }

      // Delete the card itself
      await ctx.db.delete(card._id)
    }

    // Delete the column
    await ctx.db.delete(args.columnId)

    await writeActivityLog(ctx, {
      boardId: column.boardId,
      actorId: user._id,
      actionType: 'COLUMN_DELETED',
      entityType: 'column',
      entityId: args.columnId,
      metadata: { title: column.title, cardCount: cards.length },
    })
  },
})

export const reorderColumn = mutation({
  args: {
    columnId: v.id('columns'),
    newOrderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const column = await ctx.db.get(args.columnId)
    if (!column) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Column not found' })
    }

    await assertBoardPermission(ctx, column.boardId, user._id, 'edit')

    await ctx.db.patch(args.columnId, { orderIndex: args.newOrderIndex })
  },
})

export const reindexColumns = mutation({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'edit')

    const columns = await ctx.db
      .query('columns')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .collect()

    columns.sort((a, b) => a.orderIndex - b.orderIndex)

    for (let i = 0; i < columns.length; i++) {
      const newOrderIndex = (i + 1) * 1000
      if (columns[i].orderIndex !== newOrderIndex) {
        await ctx.db.patch(columns[i]._id, { orderIndex: newOrderIndex })
      }
    }
  },
})
