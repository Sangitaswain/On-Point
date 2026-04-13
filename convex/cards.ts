import { v, ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
import { assertBoardPermission } from './lib/permissions'
import { writeActivityLog } from './lib/activityLog'
import { createNotification } from './lib/notifications'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listByBoard = query({
  args: { boardId: v.id('boards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'view')

    const cards = await ctx.db
      .query('cards')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .collect()

    return cards
  },
})

export const get = query({
  args: { cardId: v.id('cards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const card = await ctx.db.get(args.cardId)
    if (!card) throw new ConvexError({ code: 'NOT_FOUND', message: 'Card not found' })

    await assertBoardPermission(ctx, card.boardId, user._id, 'view')

    const labels = await ctx.db
      .query('cardLabels')
      .withIndex('by_card', (q) => q.eq('cardId', args.cardId))
      .collect()

    return { ...card, labels }
  },
})

export const getHistory = query({
  args: { cardId: v.id('cards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const card = await ctx.db.get(args.cardId)
    if (!card) throw new ConvexError({ code: 'NOT_FOUND', message: 'Card not found' })

    await assertBoardPermission(ctx, card.boardId, user._id, 'view')

    const history = await ctx.db
      .query('cardHistory')
      .withIndex('by_card', (q) => q.eq('cardId', args.cardId))
      .collect()

    history.sort((a, b) => b._creationTime - a._creationTime)

    return history
  },
})

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createCard = mutation({
  args: {
    columnId: v.id('columns'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const column = await ctx.db.get(args.columnId)
    if (!column) throw new ConvexError({ code: 'NOT_FOUND', message: 'Column not found' })

    await assertBoardPermission(ctx, column.boardId, user._id, 'edit')

    // Compute orderIndex: max existing + 1000, or 1000 if none
    const existingCards = await ctx.db
      .query('cards')
      .withIndex('by_column', (q) => q.eq('columnId', args.columnId))
      .collect()

    let maxOrder = 0
    for (const c of existingCards) {
      if (c.orderIndex > maxOrder) maxOrder = c.orderIndex
    }
    const orderIndex = maxOrder > 0 ? maxOrder + 1000 : 1000

    const cardId = await ctx.db.insert('cards', {
      columnId: args.columnId,
      boardId: column.boardId,
      title: args.title.trim(),
      orderIndex,
    })

    await writeActivityLog(ctx, {
      boardId: column.boardId,
      actorId: user._id,
      actionType: 'CARD_CREATED',
      entityType: 'card',
      entityId: cardId,
      metadata: { title: args.title.trim() },
    })

    const card = await ctx.db.get(cardId)
    return card!
  },
})

export const updateCard = mutation({
  args: {
    cardId: v.id('cards'),
    title: v.optional(v.string()),
    description: v.optional(v.any()),
    assigneeId: v.optional(v.id('users')),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const card = await ctx.db.get(args.cardId)
    if (!card) throw new ConvexError({ code: 'NOT_FOUND', message: 'Card not found' })

    await assertBoardPermission(ctx, card.boardId, user._id, 'edit')

    // Build patch and track changes
    const patch: Record<string, unknown> = {}
    const changedFields: string[] = []

    if (args.title !== undefined) {
      patch.title = args.title.trim()
      changedFields.push('title')
      await ctx.db.insert('cardHistory', {
        cardId: args.cardId,
        actorId: user._id,
        field: 'title',
        previousValue: card.title,
        newValue: args.title.trim(),
      })
    }

    if (args.description !== undefined) {
      patch.description = args.description
      changedFields.push('description')
      await ctx.db.insert('cardHistory', {
        cardId: args.cardId,
        actorId: user._id,
        field: 'description',
        previousValue: card.description ?? null,
        newValue: args.description,
      })
    }

    if (args.assigneeId !== undefined) {
      patch.assigneeId = args.assigneeId
      changedFields.push('assigneeId')
      await ctx.db.insert('cardHistory', {
        cardId: args.cardId,
        actorId: user._id,
        field: 'assigneeId',
        previousValue: card.assigneeId ?? null,
        newValue: args.assigneeId,
      })
    }

    if (args.dueDate !== undefined) {
      patch.dueDate = args.dueDate
      changedFields.push('dueDate')
      await ctx.db.insert('cardHistory', {
        cardId: args.cardId,
        actorId: user._id,
        field: 'dueDate',
        previousValue: card.dueDate ?? null,
        newValue: args.dueDate,
      })
    }

    if (changedFields.length === 0) {
      return args.cardId
    }

    await ctx.db.patch(args.cardId, patch)

    await writeActivityLog(ctx, {
      boardId: card.boardId,
      actorId: user._id,
      actionType: 'CARD_UPDATED',
      entityType: 'card',
      entityId: args.cardId,
      metadata: { changedFields },
    })

    // Notify new assignee if changed
    if (args.assigneeId !== undefined && args.assigneeId) {
      await createNotification(ctx, {
        userId: args.assigneeId,
        type: 'ASSIGNED',
        cardId: args.cardId,
        boardId: card.boardId,
        actorId: user._id,
      })
    }

    return args.cardId
  },
})

export const moveCard = mutation({
  args: {
    cardId: v.id('cards'),
    newColumnId: v.id('columns'),
    newOrderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const card = await ctx.db.get(args.cardId)
    if (!card) throw new ConvexError({ code: 'NOT_FOUND', message: 'Card not found' })

    const fromColumnId = card.columnId
    await assertBoardPermission(ctx, card.boardId, user._id, 'edit')

    await ctx.db.patch(args.cardId, {
      columnId: args.newColumnId,
      orderIndex: args.newOrderIndex,
    })

    // Fetch column titles for the activity log
    const fromColumn = await ctx.db.get(fromColumnId)
    const toColumn = await ctx.db.get(args.newColumnId)

    await writeActivityLog(ctx, {
      boardId: card.boardId,
      actorId: user._id,
      actionType: 'CARD_MOVED',
      entityType: 'card',
      entityId: args.cardId,
      metadata: {
        title: card.title,
        fromColumnTitle: fromColumn?.title ?? 'Unknown',
        toColumnTitle: toColumn?.title ?? 'Unknown',
      },
    })

    return args.cardId
  },
})

export const deleteCard = mutation({
  args: { cardId: v.id('cards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const card = await ctx.db.get(args.cardId)
    if (!card) throw new ConvexError({ code: 'NOT_FOUND', message: 'Card not found' })

    await assertBoardPermission(ctx, card.boardId, user._id, 'edit')

    // Delete all related cardLabels
    const labels = await ctx.db
      .query('cardLabels')
      .withIndex('by_card', (q) => q.eq('cardId', args.cardId))
      .collect()
    for (const label of labels) {
      await ctx.db.delete(label._id)
    }

    // Delete all related comments
    const comments = await ctx.db
      .query('comments')
      .withIndex('by_card', (q) => q.eq('cardId', args.cardId))
      .collect()
    for (const comment of comments) {
      await ctx.db.delete(comment._id)
    }

    // Delete all related cardHistory
    const history = await ctx.db
      .query('cardHistory')
      .withIndex('by_card', (q) => q.eq('cardId', args.cardId))
      .collect()
    for (const entry of history) {
      await ctx.db.delete(entry._id)
    }

    // Delete all notifications referencing this card
    // Notifications don't have a by_card index, so we filter by userId index
    // We need to scan — notifications table has by_user and by_user_and_read indexes.
    // Since there's no by_card index, we query all notifications and filter.
    const allNotifications = await ctx.db.query('notifications').collect()
    const cardNotifications = allNotifications.filter((n) => n.cardId === args.cardId)
    for (const notification of cardNotifications) {
      await ctx.db.delete(notification._id)
    }

    // Delete the card itself
    await ctx.db.delete(args.cardId)

    await writeActivityLog(ctx, {
      boardId: card.boardId,
      actorId: user._id,
      actionType: 'CARD_DELETED',
      entityType: 'card',
      entityId: args.cardId,
      metadata: { title: card.title },
    })
  },
})

export const setCardLabels = mutation({
  args: {
    cardId: v.id('cards'),
    labels: v.array(v.object({ label: v.string(), color: v.string() })),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const card = await ctx.db.get(args.cardId)
    if (!card) throw new ConvexError({ code: 'NOT_FOUND', message: 'Card not found' })

    await assertBoardPermission(ctx, card.boardId, user._id, 'edit')

    // Delete all existing labels for this card
    const existing = await ctx.db
      .query('cardLabels')
      .withIndex('by_card', (q) => q.eq('cardId', args.cardId))
      .collect()
    for (const label of existing) {
      await ctx.db.delete(label._id)
    }

    // Insert new labels
    for (const label of args.labels) {
      await ctx.db.insert('cardLabels', {
        cardId: args.cardId,
        label: label.label,
        color: label.color,
      })
    }

    await writeActivityLog(ctx, {
      boardId: card.boardId,
      actorId: user._id,
      actionType: 'CARD_UPDATED',
      entityType: 'card',
      entityId: args.cardId,
      metadata: { changedFields: ['labels'] },
    })
  },
})

export const reindexColumnCards = mutation({
  args: { columnId: v.id('columns') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const column = await ctx.db.get(args.columnId)
    if (!column) throw new ConvexError({ code: 'NOT_FOUND', message: 'Column not found' })

    await assertBoardPermission(ctx, column.boardId, user._id, 'edit')

    const cards = await ctx.db
      .query('cards')
      .withIndex('by_column', (q) => q.eq('columnId', args.columnId))
      .collect()

    // Sort by current orderIndex
    cards.sort((a, b) => a.orderIndex - b.orderIndex)

    // Reassign clean indices: 1000, 2000, 3000, ...
    for (let i = 0; i < cards.length; i++) {
      const newIndex = (i + 1) * 1000
      if (cards[i].orderIndex !== newIndex) {
        await ctx.db.patch(cards[i]._id, { orderIndex: newIndex })
      }
    }
  },
})
