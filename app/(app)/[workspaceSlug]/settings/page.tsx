'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ConvexError } from 'convex/values'
import { toast } from 'sonner'
import { SettingsIcon, UsersIcon, ShieldAlertIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/loading-spinner'
import { MembersList } from '@/components/workspace/MembersList'
import { InviteMemberDialog } from '@/components/workspace/InviteMemberDialog'

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspaceSlug: string }>()
  const router = useRouter()
  const workspaceSlug = params.workspaceSlug

  const workspace = useQuery(api.workspaces.getBySlug, { slug: workspaceSlug })

  // Loading
  if (workspace === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  // Not found / no access
  if (workspace === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Workspace not found
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You don&apos;t have access to this workspace or it doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/onboarding')}
          >
            Go back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <SettingsContent
      workspace={workspace}
      workspaceSlug={workspaceSlug}
    />
  )
}

type WorkspaceData = {
  _id: import('@/convex/_generated/dataModel').Id<'workspaces'>
  name: string
  slug: string
  role: 'owner' | 'admin' | 'member' | 'guest'
  ownerId: import('@/convex/_generated/dataModel').Id<'users'>
}

function SettingsContent({
  workspace,
  workspaceSlug,
}: {
  workspace: WorkspaceData
  workspaceSlug: string
}) {
  const members = useQuery(api.workspaces.listMembers, {
    workspaceId: workspace._id,
  })

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const isAdmin = workspace.role === 'owner' || workspace.role === 'admin'
  const isOwner = workspace.role === 'owner'

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">
          Workspace Settings
        </h1>
      </div>

      {/* Workspace name section */}
      <WorkspaceNameSection
        workspaceId={workspace._id}
        currentName={workspace.name}
        canEdit={isAdmin}
      />

      {/* Members section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 text-muted-foreground" />
            <h2 className="text-base font-medium text-foreground">Members</h2>
            {members && (
              <span className="text-sm text-muted-foreground">
                ({members.length})
              </span>
            )}
          </div>

          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setInviteDialogOpen(true)}
            >
              Invite member
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          {members === undefined ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <MembersList
              members={members}
              workspaceId={workspace._id}
              currentUserRole={workspace.role}
            />
          )}
        </div>
      </section>

      {/* Danger zone (owner only) */}
      {isOwner && (
        <DangerZone
          workspace={workspace}
          members={members ?? []}
        />
      )}

      {/* Invite dialog */}
      <InviteMemberDialog
        workspaceId={workspace._id}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  )
}

// ─── Workspace Name Section ─────────────────────────────────────────────────

function WorkspaceNameSection({
  workspaceId,
  currentName,
  canEdit,
}: {
  workspaceId: import('@/convex/_generated/dataModel').Id<'workspaces'>
  currentName: string
  canEdit: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(currentName)
  const [isSaving, setIsSaving] = useState(false)

  const updateName = useMutation(api.workspaces.updateWorkspaceName)

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === currentName) {
      setIsEditing(false)
      setName(currentName)
      return
    }

    setIsSaving(true)
    try {
      await updateName({ workspaceId, name: trimmed })
      toast.success('Workspace name updated')
      setIsEditing(false)
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string }
        toast.error(data.message ?? 'Failed to update name.')
      } else {
        toast.error('Failed to update name.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-muted-foreground">
          Workspace name
        </Label>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') {
                  setIsEditing(false)
                  setName(currentName)
                }
              }}
            />
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setName(currentName)
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-base font-medium text-foreground">
              {currentName}
            </p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Danger Zone ────────────────────────────────────────────────────────────

type DangerMember = {
  userId: import('@/convex/_generated/dataModel').Id<'users'>
  role: string
  name: string
}

function DangerZone({
  workspace,
  members,
}: {
  workspace: WorkspaceData
  members: DangerMember[]
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [newOwnerId, setNewOwnerId] = useState<string>('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const deleteWorkspace = useMutation(api.workspaces.deleteWorkspace)
  const transferOwnership = useMutation(api.workspaces.transferOwnership)

  const transferableMembers = members.filter(
    (m) => m.role !== 'owner' && m.userId !== workspace.ownerId
  )

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteWorkspace({ workspaceId: workspace._id })
      toast.success('Workspace deleted')
      router.push('/onboarding')
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string }
        toast.error(data.message ?? 'Failed to delete workspace.')
      } else {
        toast.error('Failed to delete workspace.')
      }
      setIsDeleting(false)
    }
  }

  const handleTransfer = async () => {
    if (!newOwnerId) return
    setIsTransferring(true)
    try {
      await transferOwnership({
        workspaceId: workspace._id,
        newOwnerId: newOwnerId as import('@/convex/_generated/dataModel').Id<'users'>,
      })
      toast.success('Ownership transferred successfully')
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string }
        toast.error(data.message ?? 'Failed to transfer ownership.')
      } else {
        toast.error('Failed to transfer ownership.')
      }
    } finally {
      setIsTransferring(false)
    }
  }

  const handleNewOwnerChange = (value: string | null) => {
    if (value) setNewOwnerId(value)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlertIcon className="size-4 text-destructive" />
        <h2 className="text-base font-medium text-destructive">Danger Zone</h2>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-card">
        {/* Transfer Ownership */}
        <div className="flex items-center justify-between border-b border-destructive/20 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Transfer ownership
            </p>
            <p className="text-xs text-muted-foreground">
              Transfer this workspace to another member. You will be demoted to
              admin.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 shrink-0"
                  disabled={transferableMembers.length === 0}
                />
              }
            >
              Transfer
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Transfer ownership</AlertDialogTitle>
                <AlertDialogDescription>
                  Select a member to become the new owner of this workspace.
                  Your role will be changed to admin.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2 px-1">
                <Label>New owner</Label>
                <Select
                  value={newOwnerId}
                  onValueChange={handleNewOwnerChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferableMembers.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleTransfer}
                  disabled={!newOwnerId || isTransferring}
                >
                  {isTransferring ? 'Transferring...' : 'Transfer Ownership'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Delete Workspace */}
        <div className="flex items-center justify-between p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Delete workspace
            </p>
            <p className="text-xs text-muted-foreground">
              Permanently delete this workspace and all its data. This action
              cannot be undone.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-4 shrink-0"
                />
              }
            >
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete workspace</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete{' '}
                  <span className="font-medium text-foreground">
                    {workspace.name}
                  </span>{' '}
                  and all its boards, cards, and data. This action cannot be
                  undone. Type{' '}
                  <span className="font-mono text-foreground">
                    {workspace.name}
                  </span>{' '}
                  to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="px-1">
                <Input
                  placeholder={workspace.name}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={
                    deleteConfirmText !== workspace.name || isDeleting
                  }
                >
                  {isDeleting ? 'Deleting...' : 'Delete Workspace'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  )
}
