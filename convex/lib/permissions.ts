import { QueryCtx, MutationCtx } from '../_generated/server'
import { Id } from '../_generated/dataModel'
import { ConvexError } from 'convex/values'

const ROLE_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  guest: 1,
}

/**
 * Asserts the caller has at least the required role in the given workspace.
 * Throws FORBIDDEN if the user is not a member or their role is insufficient.
 */
export async function assertWorkspaceRole(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<'workspaces'>,
  userId: Id<'users'>,
  required: 'owner' | 'admin' | 'member'
): Promise<void> {
  const member = await ctx.db
    .query('workspaceMembers')
    .withIndex('by_workspace_and_user', (q) =>
      q.eq('workspaceId', workspaceId).eq('userId', userId)
    )
    .unique()

  if (!member || ROLE_RANK[member.role] < ROLE_RANK[required]) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'Insufficient workspace role',
    })
  }
}

// ---------------------------------------------------------------------------
// Board-level permissions
// ---------------------------------------------------------------------------

const PERM_RANK: Record<string, number> = {
  edit: 3,
  comment: 2,
  view: 1,
}

/**
 * Resolve the effective permission for a user on a board.
 * Priority: board-level override > workspace role mapping.
 */
export async function getEffectiveBoardPermission(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<'boards'>,
  userId: Id<'users'>
): Promise<'edit' | 'comment' | 'view' | null> {
  // 1. Check board-level override
  const boardMember = await ctx.db
    .query('boardMembers')
    .withIndex('by_board_and_user', (q) =>
      q.eq('boardId', boardId).eq('userId', userId)
    )
    .unique()

  if (boardMember) return boardMember.permission

  // 2. Fall back to workspace role
  const board = await ctx.db.get(boardId)
  if (!board) return null

  // Board creator always gets edit access regardless of visibility
  if (board.createdBy === userId) return 'edit'

  // Private boards: only explicit board members (creator already handled above)
  if (board.visibility === 'private') return null

  // Workspace boards: map workspace role to a default board permission
  const wsMember = await ctx.db
    .query('workspaceMembers')
    .withIndex('by_workspace_and_user', (q) =>
      q.eq('workspaceId', board.workspaceId).eq('userId', userId)
    )
    .unique()

  if (!wsMember) return null

  const roleMap: Record<string, 'edit' | 'comment' | 'view'> = {
    owner: 'edit',
    admin: 'edit',
    member: 'edit',
    guest: 'view',
  }
  return roleMap[wsMember.role] ?? 'view'
}

/**
 * Throws ConvexError if the user does not have the required permission on the board.
 */
export async function assertBoardPermission(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<'boards'>,
  userId: Id<'users'>,
  required: 'edit' | 'comment' | 'view'
): Promise<void> {
  const perm = await getEffectiveBoardPermission(ctx, boardId, userId)

  if (!perm || PERM_RANK[perm] < PERM_RANK[required]) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'Insufficient permission',
    })
  }
}
