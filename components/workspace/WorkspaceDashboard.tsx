'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Plus, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/loading-spinner'
import { BoardCard } from '@/components/workspace/BoardCard'
import { CreateBoardDialog } from '@/components/workspace/CreateBoardDialog'
import { InviteMemberDialog } from '@/components/workspace/InviteMemberDialog'

interface WorkspaceDashboardProps {
  workspace: {
    _id: Id<'workspaces'>
    name: string
    slug: string
    role: 'owner' | 'admin' | 'member' | 'guest'
  }
}

export function WorkspaceDashboard({ workspace }: WorkspaceDashboardProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const canInvite = workspace.role === 'owner' || workspace.role === 'admin'

  const boards = useQuery(api.boards.listByWorkspace, {
    workspaceId: workspace._id,
  })

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {workspace.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your boards and projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canInvite && (
            <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="size-4" data-icon="inline-start" />
              Invite
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4" data-icon="inline-start" />
            New Board
          </Button>
        </div>
      </div>

      {/* Board grid */}
      {boards === undefined ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <p className="text-lg font-medium text-foreground">No boards yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one to get started.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="size-4" data-icon="inline-start" />
            Create your first board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard
              key={board._id}
              board={board}
              workspaceSlug={workspace.slug}
            />
          ))}
        </div>
      )}

      {/* Create board dialog */}
      <CreateBoardDialog
        workspaceId={workspace._id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Invite member dialog */}
      <InviteMemberDialog
        workspaceId={workspace._id}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  )
}
