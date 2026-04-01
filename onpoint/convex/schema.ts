import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({

  // ─── Users ──────────────────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  })
  .index('by_clerk_id', ['clerkId'])
  .index('by_email', ['email']),

  // ─── Workspaces ─────────────────────────────────────────────────────────
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerId: v.id('users'),
  })
  .index('by_slug', ['slug'])
  .index('by_owner', ['ownerId']),

  // ─── Workspace Members ──────────────────────────────────────────────────
  workspaceMembers: defineTable({
    workspaceId: v.id('workspaces'),
    userId: v.id('users'),
    role: v.union(
      v.literal('owner'),
      v.literal('admin'),
      v.literal('member'),
      v.literal('guest')
    ),
  })
  .index('by_workspace', ['workspaceId'])
  .index('by_user', ['userId'])
  .index('by_workspace_and_user', ['workspaceId', 'userId']),

  // ─── Workspace Invites ──────────────────────────────────────────────────
  workspaceInvites: defineTable({
    workspaceId: v.id('workspaces'),
    token: v.string(),
    invitedEmail: v.optional(v.string()),
    role: v.union(
      v.literal('admin'),
      v.literal('member'),
      v.literal('guest')
    ),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdBy: v.id('users'),
  })
  .index('by_token', ['token'])
  .index('by_workspace', ['workspaceId']),

  // ─── Boards ─────────────────────────────────────────────────────────────
  boards: defineTable({
    workspaceId: v.id('workspaces'),
    title: v.string(),
    visibility: v.union(v.literal('private'), v.literal('workspace')),
    createdBy: v.id('users'),
  })
  .index('by_workspace', ['workspaceId']),

  // ─── Board Members ─────────────────────────────────────────────────────
  boardMembers: defineTable({
    boardId: v.id('boards'),
    userId: v.id('users'),
    permission: v.union(
      v.literal('edit'),
      v.literal('comment'),
      v.literal('view')
    ),
  })
  .index('by_board', ['boardId'])
  .index('by_board_and_user', ['boardId', 'userId']),

  // ─── Columns ────────────────────────────────────────────────────────────
  columns: defineTable({
    boardId: v.id('boards'),
    title: v.string(),
    orderIndex: v.number(),
  })
  .index('by_board', ['boardId']),

  // ─── Cards ──────────────────────────────────────────────────────────────
  cards: defineTable({
    columnId: v.id('columns'),
    boardId: v.id('boards'),
    title: v.string(),
    description: v.optional(v.any()),
    assigneeId: v.optional(v.id('users')),
    dueDate: v.optional(v.string()),
    orderIndex: v.number(),
  })
  .index('by_column', ['columnId'])
  .index('by_board', ['boardId']),

  // ─── Card Labels ────────────────────────────────────────────────────────
  cardLabels: defineTable({
    cardId: v.id('cards'),
    label: v.string(),
    color: v.string(),
  })
  .index('by_card', ['cardId']),

  // ─── Comments ───────────────────────────────────────────────────────────
  comments: defineTable({
    cardId: v.id('cards'),
    boardId: v.id('boards'),
    authorId: v.id('users'),
    body: v.any(),
    editedAt: v.optional(v.number()),
  })
  .index('by_card', ['cardId']),

  // ─── Activity Log ──────────────────────────────────────────────────────
  activityLogs: defineTable({
    boardId: v.id('boards'),
    actorId: v.id('users'),
    actionType: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.any(),
  })
  .index('by_board', ['boardId'])
  .index('by_board_and_actor', ['boardId', 'actorId'])
  .index('by_board_and_action', ['boardId', 'actionType']),

  // ─── Notifications ─────────────────────────────────────────────────────
  notifications: defineTable({
    userId: v.id('users'),
    type: v.union(
      v.literal('ASSIGNED'),
      v.literal('MENTIONED')
    ),
    cardId: v.id('cards'),
    boardId: v.id('boards'),
    actorId: v.id('users'),
    isRead: v.boolean(),
  })
  .index('by_user', ['userId'])
  .index('by_user_and_read', ['userId', 'isRead']),

  // ─── Chat Messages ─────────────────────────────────────────────────────
  chatMessages: defineTable({
    boardId: v.id('boards'),
    userId: v.id('users'),
    body: v.string(),
  })
  .index('by_board', ['boardId']),

  // ─── Card History ──────────────────────────────────────────────────────
  cardHistory: defineTable({
    cardId: v.id('cards'),
    actorId: v.id('users'),
    field: v.string(),
    previousValue: v.any(),
    newValue: v.any(),
  })
  .index('by_card', ['cardId']),

})
