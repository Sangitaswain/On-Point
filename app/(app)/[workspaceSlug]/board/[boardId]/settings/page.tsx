'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { ArrowLeft } from 'lucide-react'

import { LoadingSpinner } from '@/components/loading-spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export default function BoardSettingsPage() {
  const params = useParams<{ workspaceSlug: string; boardId: string }>()
  const workspaceSlug = params.workspaceSlug
  const boardId = params.boardId as Id<'boards'>

  const board = useQuery(api.boards.get, { boardId })
  const members = useQuery(api.boards.getMembers, { boardId })

  const updateBoard = useMutation(api.boards.updateBoard)
  const setPermission = useMutation(api.boards.setBoardMemberPermission)

  const [boardName, setBoardName] = useState('')
  const [nameInitialized, setNameInitialized] = useState(false)

  // Sync board name from server on first load
  useEffect(() => {
    if (board && !nameInitialized) {
      setBoardName(board.title)
      setNameInitialized(true)
    }
  }, [board, nameInitialized])

  const handleNameBlur = useCallback(() => {
    const trimmed = boardName.trim()
    if (trimmed && board && trimmed !== board.title) {
      updateBoard({ boardId, title: trimmed })
    }
  }, [boardName, board, boardId, updateBoard])

  const handleVisibilityChange = useCallback(
    (value: string | null) => {
      if (!value) return
      const visibility = value as 'private' | 'workspace'
      updateBoard({ boardId, visibility })
    },
    [boardId, updateBoard]
  )

  const handlePermissionChange = useCallback(
    (userId: Id<'users'>, permission: string | null) => {
      if (!permission) return
      setPermission({
        boardId,
        targetUserId: userId,
        permission: permission as 'edit' | 'comment' | 'view',
      })
    },
    [boardId, setPermission]
  )

  // Loading
  if (board === undefined || members === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (board === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-medium text-foreground">Board not found</p>
          <p className="text-sm text-muted-foreground">
            This board does not exist or you do not have access to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <Link
          href={`/${workspaceSlug}/board/${boardId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to board
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Board Settings</h1>
      </div>

      {/* Board name */}
      <section className="mb-8">
        <Label htmlFor="board-name" className="mb-2 block text-sm font-medium">
          Board name
        </Label>
        <Input
          id="board-name"
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
          onBlur={handleNameBlur}
          className="max-w-sm"
        />
      </section>

      {/* Visibility */}
      <section className="mb-8">
        <Label className="mb-2 block text-sm font-medium">Visibility</Label>
        <Select value={board.visibility} onValueChange={handleVisibilityChange}>
          <SelectTrigger className="max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="workspace">Workspace - visible to all members</SelectItem>
            <SelectItem value="private">Private - invite only</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {/* Member permissions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Member Permissions
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No board-specific permissions set. All workspace members have default access based on visibility.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Member
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Permission
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          {member.avatarUrl ? (
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                          ) : null}
                          <AvatarFallback>
                            {member.name
                              ? member.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)
                              : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {member.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={member.permission}
                        onValueChange={(value) =>
                          handlePermissionChange(member.userId, value)
                        }
                      >
                        <SelectTrigger size="sm" className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="comment">Comment</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
