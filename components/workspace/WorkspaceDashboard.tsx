'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Plus, UserPlus, LayoutGrid } from 'lucide-react'

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
    <div className="p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {workspace.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your boards and collaborate with your team
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canInvite && (
              <Button variant="outline" size="sm" onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="size-3.5" />
                Invite
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="size-3.5" />
              New Board
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        {boards && boards.length > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <LayoutGrid className="size-3.5 text-primary" />
              <span><span className="font-semibold text-foreground">{boards.length}</span> board{boards.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Board grid */}
      {boards === undefined ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-20 gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <LayoutGrid className="size-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">No boards yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create your first board to get started</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)} className="mt-1">
            <Plus className="size-3.5" />
            Create board
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
          {/* Add board card */}
          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground p-4 transition-all hover:border-primary/40 hover:text-primary hover:bg-primary/5 min-h-[84px]"
          >
            <Plus className="size-4" />
            New board
          </button>
        </div>
      )}

      <CreateBoardDialog
        workspaceId={workspace._id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <InviteMemberDialog
        workspaceId={workspace._id}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  )
}
