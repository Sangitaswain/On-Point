'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ConvexError } from 'convex/values'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type Member = {
  _id: Id<'workspaceMembers'>
  userId: Id<'users'>
  role: 'owner' | 'admin' | 'member' | 'guest'
  name: string
  email: string
  avatarUrl: string | null
}

type MembersListProps = {
  members: Member[]
  workspaceId: Id<'workspaces'>
  currentUserRole: 'owner' | 'admin' | 'member' | 'guest'
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
}

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
  guest: 'outline',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function MembersList({
  members,
  workspaceId,
  currentUserRole,
}: MembersListProps) {
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  return (
    <div className="space-y-1">
      {members.map((member) => (
        <MemberRow
          key={member._id}
          member={member}
          workspaceId={workspaceId}
          canManage={canManage}
        />
      ))}
      {members.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No members found.
        </p>
      )}
    </div>
  )
}

function MemberRow({
  member,
  workspaceId,
  canManage,
}: {
  member: Member
  workspaceId: Id<'workspaces'>
  canManage: boolean
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const updateMemberRole = useMutation(api.workspaces.updateMemberRole)
  const removeMember = useMutation(api.workspaces.removeMember)

  const isOwner = member.role === 'owner'

  const handleRoleChange = async (newRole: string | null) => {
    if (!newRole || newRole === member.role) return
    setIsUpdating(true)
    try {
      await updateMemberRole({
        workspaceId,
        targetUserId: member.userId,
        newRole: newRole as 'admin' | 'member' | 'guest',
      })
      toast.success(`Updated ${member.name}'s role to ${ROLE_LABELS[newRole]}`)
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string }
        toast.error(data.message ?? 'Failed to update role.')
      } else {
        toast.error('Failed to update role.')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await removeMember({
        workspaceId,
        targetUserId: member.userId,
      })
      toast.success(`Removed ${member.name} from workspace`)
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string }
        toast.error(data.message ?? 'Failed to remove member.')
      } else {
        toast.error('Failed to remove member.')
      }
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
      {/* Avatar */}
      <Avatar size="default">
        {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {member.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>

      {/* Role */}
      {canManage && !isOwner ? (
        <Select
          value={member.role}
          onValueChange={handleRoleChange}
          disabled={isUpdating}
        >
          <SelectTrigger size="sm" className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="guest">Guest</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Badge variant={ROLE_VARIANTS[member.role]}>
          {ROLE_LABELS[member.role]}
        </Badge>
      )}

      {/* Remove button */}
      {canManage && !isOwner && (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isRemoving}
                aria-label={`Remove ${member.name}`}
              />
            }
          >
            <svg
              className="size-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{' '}
                <span className="font-medium text-foreground">
                  {member.name}
                </span>{' '}
                from this workspace? They will lose access to all boards and
                content.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleRemove}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
