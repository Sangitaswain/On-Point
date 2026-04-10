'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Pencil, Trash2 } from 'lucide-react'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface CommentData {
  _id: Id<'comments'>
  cardId: Id<'cards'>
  boardId: Id<'boards'>
  authorId: Id<'users'>
  body: unknown
  editedAt?: number
  _creationTime: number
  authorName: string
  authorAvatarUrl?: string
}

interface CommentItemProps {
  comment: CommentData
  currentUserId?: Id<'users'>
}

function relativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function getCommentText(body: unknown): string {
  if (typeof body === 'string') return body
  if (body && typeof body === 'object' && 'text' in body) {
    return String((body as { text: unknown }).text)
  }
  // Tiptap JSON - try to extract text
  if (body && typeof body === 'object' && 'content' in body) {
    try {
      return JSON.stringify(body)
    } catch {
      return '[Comment]'
    }
  }
  try {
    return String(body)
  } catch {
    return '[Comment]'
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function CommentItem({ comment, currentUserId }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const updateComment = useMutation(api.comments.updateComment)
  const deleteComment = useMutation(api.comments.deleteComment)

  const isAuthor = currentUserId === comment.authorId

  const handleStartEdit = useCallback(() => {
    setEditValue(getCommentText(comment.body))
    setIsEditing(true)
  }, [comment.body])

  const handleSaveEdit = useCallback(async () => {
    const trimmed = editValue.trim()
    if (!trimmed) return
    try {
      await updateComment({ commentId: comment._id, body: trimmed })
    } catch {
      // Could show toast
    }
    setIsEditing(false)
  }, [editValue, comment._id, updateComment])

  const handleDelete = useCallback(async () => {
    try {
      await deleteComment({ commentId: comment._id })
    } catch {
      // Could show toast
    }
  }, [comment._id, deleteComment])

  return (
    <div className="group flex gap-3">
      <Avatar size="sm" className="mt-0.5 shrink-0">
        {comment.authorAvatarUrl && (
          <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorName} />
        )}
        <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.authorName}</span>
          <span className="text-xs text-muted-foreground">
            {relativeTime(comment._creationTime)}
          </span>
          {comment.editedAt && (
            <span className="text-xs text-muted-foreground italic">
              (edited)
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 flex flex-col gap-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[60px]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="xs" onClick={handleSaveEdit}>
                Save
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap break-words">
            {getCommentText(comment.body)}
          </p>
        )}

        {/* Action buttons - visible on hover */}
        {!isEditing && (
          <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAuthor && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleStartEdit}
                aria-label="Edit comment"
              >
                <Pencil className="size-3" />
              </Button>
            )}
            {/* Author or admin can delete */}
            {(isAuthor || currentUserId) && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  }
                />
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
