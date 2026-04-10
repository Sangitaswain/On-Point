import { v, ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
import { assertWorkspaceRole } from './lib/permissions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a v4-style UUID without relying on node:crypto (unavailable in Convex). */
function generateToken(): string {
  const hex = '0123456789abcdef'
  const segments = [8, 4, 4, 4, 12]
  return segments
    .map((len) => {
      let s = ''
      for (let i = 0; i < len; i++) {
        s += hex[Math.floor(Math.random() * 16)]
      }
      return s
    })
    .join('-')
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// ─── Existing: Create & List ─────────────────────────────────────────────────

export const createWorkspace = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    if (!args.name.trim()) {
      throw new ConvexError({
        code: 'INVALID_INPUT',
        message: 'Workspace name is required',
      })
    }

    // Generate slug from name
    let slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check uniqueness, append random suffix if taken
    const existing = await ctx.db
      .query('workspaces')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()

    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`
    }

    // Create workspace
    const workspaceId = await ctx.db.insert('workspaces', {
      name: args.name.trim(),
      slug,
      ownerId: user._id,
    })

    // Add creator as owner member
    await ctx.db.insert('workspaceMembers', {
      workspaceId,
      userId: user._id,
      role: 'owner',
    })

    return { workspaceId, slug }
  },
})

export const listMyWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)

    const memberships = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const workspace = await ctx.db.get(m.workspaceId)
        return workspace ? { ...workspace, role: m.role } : null
      })
    )

    return workspaces.filter(Boolean)
  },
})

// ─── Step 3.1: Workspace CRUD ────────────────────────────────────────────────

export const updateWorkspaceName = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertWorkspaceRole(ctx, args.workspaceId, user._id, 'admin')

    const trimmed = args.name.trim()
    if (!trimmed) {
      throw new ConvexError({
        code: 'INVALID_INPUT',
        message: 'Workspace name is required',
      })
    }

    await ctx.db.patch(args.workspaceId, { name: trimmed })
  },
})

export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.id('workspaces'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertWorkspaceRole(ctx, args.workspaceId, user._id, 'owner')

    // Collect all boards belonging to this workspace
    const boards = await ctx.db
      .query('boards')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()

    // For each board, cascade-delete all child entities
    for (const board of boards) {
      const columns = await ctx.db
        .query('columns')
        .withIndex('by_board', (q) => q.eq('boardId', board._id))
        .collect()

      const cards = await ctx.db
        .query('cards')
        .withIndex('by_board', (q) => q.eq('boardId', board._id))
        .collect()

      // Delete card-level children
      for (const card of cards) {
        const cardLabels = await ctx.db
          .query('cardLabels')
          .withIndex('by_card', (q) => q.eq('cardId', card._id))
          .collect()
        for (const label of cardLabels) {
          await ctx.db.delete(label._id)
        }

        const comments = await ctx.db
          .query('comments')
          .withIndex('by_card', (q) => q.eq('cardId', card._id))
          .collect()
        for (const comment of comments) {
          await ctx.db.delete(comment._id)
        }

        await ctx.db.delete(card._id)
      }

      // Delete columns
      for (const column of columns) {
        await ctx.db.delete(column._id)
      }

      // Delete board-level children
      const activityLogs = await ctx.db
        .query('activityLogs')
        .withIndex('by_board', (q) => q.eq('boardId', board._id))
        .collect()
      for (const log of activityLogs) {
        await ctx.db.delete(log._id)
      }

      const chatMessages = await ctx.db
        .query('chatMessages')
        .withIndex('by_board', (q) => q.eq('boardId', board._id))
        .collect()
      for (const msg of chatMessages) {
        await ctx.db.delete(msg._id)
      }

      const boardMembers = await ctx.db
        .query('boardMembers')
        .withIndex('by_board', (q) => q.eq('boardId', board._id))
        .collect()
      for (const bm of boardMembers) {
        await ctx.db.delete(bm._id)
      }

      await ctx.db.delete(board._id)
    }

    // Delete workspace-level children
    const workspaceMembers = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()
    for (const wm of workspaceMembers) {
      await ctx.db.delete(wm._id)
    }

    const workspaceInvites = await ctx.db
      .query('workspaceInvites')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()
    for (const inv of workspaceInvites) {
      await ctx.db.delete(inv._id)
    }

    // Finally delete the workspace itself
    await ctx.db.delete(args.workspaceId)
  },
})

// ─── Step 3.1: Workspace Queries ─────────────────────────────────────────────

export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const workspace = await ctx.db
      .query('workspaces')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!workspace) return null

    // Check caller is a member and fetch their role
    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_and_user', (q) =>
        q.eq('workspaceId', workspace._id).eq('userId', user._id)
      )
      .unique()

    if (!membership) return null

    return { ...workspace, role: membership.role }
  },
})

export const listMembers = query({
  args: {
    workspaceId: v.id('workspaces'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    // Verify caller is a member
    const callerMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_and_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id)
      )
      .unique()

    if (!callerMembership) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this workspace',
      })
    }

    const members = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()

    return Promise.all(
      members.map(async (m) => {
        const memberUser = await ctx.db.get(m.userId)
        return {
          _id: m._id,
          userId: m.userId,
          role: m.role,
          name: memberUser?.name ?? 'Unknown',
          email: memberUser?.email ?? '',
          avatarUrl: memberUser?.avatarUrl ?? null,
        }
      })
    )
  },
})

// ─── Step 3.2: Invites ───────────────────────────────────────────────────────

export const createInvite = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    role: v.union(
      v.literal('admin'),
      v.literal('member'),
      v.literal('guest')
    ),
    invitedEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertWorkspaceRole(ctx, args.workspaceId, user._id, 'admin')

    const token = generateToken()

    await ctx.db.insert('workspaceInvites', {
      workspaceId: args.workspaceId,
      token,
      role: args.role,
      invitedEmail: args.invitedEmail,
      expiresAt: Date.now() + SEVEN_DAYS_MS,
      createdBy: user._id,
    })

    return { token }
  },
})

export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const invite = await ctx.db
      .query('workspaceInvites')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()

    if (!invite) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Invite not found',
      })
    }

    if (invite.usedAt) {
      throw new ConvexError({
        code: 'INVALID_INPUT',
        message: 'Invite has already been used',
      })
    }

    if (Date.now() > invite.expiresAt) {
      throw new ConvexError({
        code: 'INVALID_INPUT',
        message: 'Invite has expired',
      })
    }

    // Check user is not already a member
    const existingMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_and_user', (q) =>
        q.eq('workspaceId', invite.workspaceId).eq('userId', user._id)
      )
      .unique()

    if (existingMembership) {
      throw new ConvexError({
        code: 'INVALID_INPUT',
        message: 'You are already a member of this workspace',
      })
    }

    // Create membership
    await ctx.db.insert('workspaceMembers', {
      workspaceId: invite.workspaceId,
      userId: user._id,
      role: invite.role,
    })

    // Mark invite as used
    await ctx.db.patch(invite._id, { usedAt: Date.now() })

    // Return workspace slug for redirect
    const workspace = await ctx.db.get(invite.workspaceId)
    if (!workspace) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Workspace no longer exists',
      })
    }

    return { slug: workspace.slug }
  },
})

// ─── Step 3.3: Member Management ─────────────────────────────────────────────

export const updateMemberRole = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    targetUserId: v.id('users'),
    newRole: v.union(
      v.literal('admin'),
      v.literal('member'),
      v.literal('guest')
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertWorkspaceRole(ctx, args.workspaceId, user._id, 'admin')

    if (args.targetUserId === user._id) {
      throw new ConvexError({
        code: 'INVALID_INPUT',
        message: 'Cannot change your own role',
      })
    }

    // Look up target membership
    const targetMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_and_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', args.targetUserId)
      )
      .unique()

    if (!targetMembership) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Target user is not a member of this workspace',
      })
    }

    // Only owner can change another owner's role
    if (targetMembership.role === 'owner') {
      const workspace = await ctx.db.get(args.workspaceId)
      if (!workspace || workspace.ownerId !== user._id) {
        throw new ConvexError({
          code: 'FORBIDDEN',
          message: "Only the workspace owner can change the owner's role",
        })
      }
    }

    await ctx.db.patch(targetMembership._id, { role: args.newRole })
  },
})

export const removeMember = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    targetUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await assertWorkspaceRole(ctx, args.workspaceId, user._id, 'admin')

    // Cannot remove the workspace owner
    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Workspace not found',
      })
    }

    if (args.targetUserId === workspace.ownerId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Cannot remove the workspace owner',
      })
    }

    // Delete workspace membership
    const membership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_and_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', args.targetUserId)
      )
      .unique()

    if (!membership) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Target user is not a member of this workspace',
      })
    }

    await ctx.db.delete(membership._id)

    // Remove from all boards in this workspace
    const boards = await ctx.db
      .query('boards')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect()

    for (const board of boards) {
      const boardMembership = await ctx.db
        .query('boardMembers')
        .withIndex('by_board_and_user', (q) =>
          q.eq('boardId', board._id).eq('userId', args.targetUserId)
        )
        .unique()

      if (boardMembership) {
        await ctx.db.delete(boardMembership._id)
      }
    }
  },
})

export const transferOwnership = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    newOwnerId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    // Must be the current owner
    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Workspace not found',
      })
    }

    if (workspace.ownerId !== user._id) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only the current owner can transfer ownership',
      })
    }

    if (args.newOwnerId === user._id) {
      throw new ConvexError({
        code: 'INVALID_INPUT',
        message: 'You are already the owner',
      })
    }

    // Verify the new owner is a workspace member
    const newOwnerMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_and_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', args.newOwnerId)
      )
      .unique()

    if (!newOwnerMembership) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'New owner must be a workspace member',
      })
    }

    // Transfer ownership on the workspace document
    await ctx.db.patch(args.workspaceId, { ownerId: args.newOwnerId })

    // Promote new owner's membership to 'owner'
    await ctx.db.patch(newOwnerMembership._id, { role: 'owner' as const })

    // Demote caller's membership to 'admin'
    const callerMembership = await ctx.db
      .query('workspaceMembers')
      .withIndex('by_workspace_and_user', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id)
      )
      .unique()

    if (callerMembership) {
      await ctx.db.patch(callerMembership._id, { role: 'admin' as const })
    }
  },
})

// ─── Step 3.6: Invite info query ─────────────────────────────────────────────

export const getInviteByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query('workspaceInvites')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()

    if (!invite) return null

    const workspace = await ctx.db.get(invite.workspaceId)
    if (!workspace) return null

    return {
      workspaceName: workspace.name,
      role: invite.role,
      expired: invite.expiresAt < Date.now(),
      used: !!invite.usedAt,
    }
  },
})
