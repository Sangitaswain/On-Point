import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
import { assertWorkspaceRole, assertBoardPermission, getEffectiveBoardPermission } from './lib/permissions'
import { writeActivityLog } from './lib/activityLog'
import { ConvexError } from 'convex/values'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Returns the calling user's effective permission on a board ('edit' | 'comment' | 'view' | null). */
export const getMyPermission = query({
  args: { boardId: v.id('boards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    return getEffectiveBoardPermission(ctx, args.boardId, user._id)
  },
})

export const listByWorkspace = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    // Get all boards in workspace
    const boards = await ctx.db
      .query('boards')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()

    // Filter by visibility and user access
    const visibleBoards = []
    for (const board of boards) {
      if (board.visibility === 'workspace') {
        visibleBoards.push(board)
      } else {
        // Private board -- check if user is a board member or creator
        const boardMember = await ctx.db
          .query('boardMembers')
          .withIndex('by_board_and_user', (q) =>
            q.eq('boardId', board._id).eq('userId', user._id)
          )
          .unique()
        if (boardMember || board.createdBy === user._id) {
          visibleBoards.push(board)
        }
      }
    }

    return visibleBoards
  },
})

export const get = query({
  args: { boardId: v.id('boards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'view')

    const board = await ctx.db.get(args.boardId)
    if (!board) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Board not found' })
    }
    return board
  },
})

export const getMembers = query({
  args: { boardId: v.id('boards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'view')

    const members = await ctx.db
      .query('boardMembers')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .collect()

    const result = []
    for (const member of members) {
      const memberUser = await ctx.db.get(member.userId)
      result.push({
        userId: member.userId,
        permission: member.permission,
        name: memberUser?.name ?? '',
        email: memberUser?.email ?? '',
        avatarUrl: memberUser?.avatarUrl ?? undefined,
      })
    }

    return result
  },
})

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createBoard = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    title: v.string(),
    visibility: v.union(v.literal('private'), v.literal('workspace')),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertWorkspaceRole(ctx, args.workspaceId, user._id, 'member')

    const boardId = await ctx.db.insert('boards', {
      workspaceId: args.workspaceId,
      title: args.title.trim(),
      visibility: args.visibility,
      createdBy: user._id,
    })

    // Add creator as explicit board member with edit access
    await ctx.db.insert('boardMembers', {
      boardId,
      userId: user._id,
      permission: 'edit',
    })

    await writeActivityLog(ctx, {
      boardId,
      actorId: user._id,
      actionType: 'BOARD_CREATED',
      entityType: 'board',
      entityId: boardId as string,
      metadata: { title: args.title },
    })

    return boardId
  },
})

export const updateBoard = mutation({
  args: {
    boardId: v.id('boards'),
    title: v.optional(v.string()),
    visibility: v.optional(
      v.union(v.literal('private'), v.literal('workspace'))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertBoardPermission(ctx, args.boardId, user._id, 'edit')

    const patch: Record<string, unknown> = {}
    if (args.title !== undefined) {
      patch.title = args.title.trim()
    }
    if (args.visibility !== undefined) {
      patch.visibility = args.visibility
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.boardId, patch)
    }
  },
})

export const deleteBoard = mutation({
  args: { boardId: v.id('boards') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const board = await ctx.db.get(args.boardId)
    if (!board) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Board not found' })
    }

    // Only workspace admins (or higher) may delete boards
    await assertWorkspaceRole(ctx, board.workspaceId, user._id, 'admin')

    // --- CASCADE DELETE ---

    // 1. Columns and their children
    const columns = await ctx.db
      .query('columns')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .collect()

    for (const column of columns) {
      const cards = await ctx.db
        .query('cards')
        .withIndex('by_column', (q) => q.eq('columnId', column._id))
        .collect()

      for (const card of cards) {
        // Card labels
        const labels = await ctx.db
          .query('cardLabels')
          .withIndex('by_card', (q) => q.eq('cardId', card._id))
          .collect()
        for (const label of labels) {
          await ctx.db.delete(label._id)
        }

        // Comments
        const comments = await ctx.db
          .query('comments')
          .withIndex('by_card', (q) => q.eq('cardId', card._id))
          .collect()
        for (const comment of comments) {
          await ctx.db.delete(comment._id)
        }

        // Card history
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
      await ctx.db.delete(column._id)
    }

    // 2. Activity logs for this board
    const activityLogs = await ctx.db
      .query('activityLogs')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .collect()
    for (const log of activityLogs) {
      await ctx.db.delete(log._id)
    }

    // 3. Chat messages for this board
    const chatMessages = await ctx.db
      .query('chatMessages')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .collect()
    for (const msg of chatMessages) {
      await ctx.db.delete(msg._id)
    }

    // 4. Board members
    const boardMembers = await ctx.db
      .query('boardMembers')
      .withIndex('by_board', (q) => q.eq('boardId', args.boardId))
      .collect()
    for (const bm of boardMembers) {
      await ctx.db.delete(bm._id)
    }

    // 5. Notifications referencing this board
    // notifications does not have a by_board index, so we scan by known indexes
    // We collect all and filter in-memory since there is no by_board index
    const allNotifications = await ctx.db.query('notifications').collect()
    const boardNotifications = allNotifications.filter(
      (n) => n.boardId === args.boardId
    )
    for (const notif of boardNotifications) {
      await ctx.db.delete(notif._id)
    }

    // 6. Delete the board itself
    await ctx.db.delete(args.boardId)
  },
})

export const setBoardMemberPermission = mutation({
  args: {
    boardId: v.id('boards'),
    targetUserId: v.id('users'),
    permission: v.union(
      v.literal('edit'),
      v.literal('comment'),
      v.literal('view')
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const board = await ctx.db.get(args.boardId)
    if (!board) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Board not found' })
    }

    // Only workspace admins can manage board member permissions
    await assertWorkspaceRole(ctx, board.workspaceId, user._id, 'admin')

    // Upsert: check if board member already exists
    const existing = await ctx.db
      .query('boardMembers')
      .withIndex('by_board_and_user', (q) =>
        q.eq('boardId', args.boardId).eq('userId', args.targetUserId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { permission: args.permission })
    } else {
      await ctx.db.insert('boardMembers', {
        boardId: args.boardId,
        userId: args.targetUserId,
        permission: args.permission,
      })
    }
  },
})
