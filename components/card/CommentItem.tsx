'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Pencil, Trash2 } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
  const diffSec = Math.floor((now - timestamp) / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// Shared Mention extension config — no suggestions needed for view/edit
const mentionViewConfig = Mention.configure({
  HTMLAttributes: { class: 'text-primary font-medium' },
  suggestion: { items: () => [] },
})

function CommentBody({ body }: { body: unknown }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [StarterKit, mentionViewConfig],
    content: typeof body === 'string'
      ? body
      : body && typeof body === 'object' ? body as object : '',
    editorProps: {
      attributes: { class: 'prose prose-sm dark:prose-invert max-w-none outline-none text-sm text-foreground/90' },
    },
  })
  return <EditorContent editor={editor} />
}

function CommentEditEditor({
  initialBody,
  onSave,
  onCancel,
}: {
  initialBody: unknown
  onSave: (json: object) => void
  onCancel: () => void
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, mentionViewConfig],
    content: typeof initialBody === 'string'
      ? initialBody
      : initialBody && typeof initialBody === 'object' ? initialBody as object : '',
    editorProps: {
      attributes: { class: 'outline-none text-sm min-h-[60px] px-3 py-2' },
    },
    autofocus: true,
  })

  return (
    <div className="mt-1 flex flex-col gap-2">
      <div className="rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring/30">
        <EditorContent editor={editor} />
      </div>
      <div className="flex gap-2">
        <Button size="xs" onClick={() => editor && onSave(editor.getJSON())}>
          Save
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function CommentItem({ comment, currentUserId }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)

  const updateComment = useMutation(api.comments.updateComment)
  const deleteComment = useMutation(api.comments.deleteComment)

  const isAuthor = currentUserId === comment.authorId

  const handleSaveEdit = useCallback(
    async (json: object) => {
      try {
        await updateComment({ commentId: comment._id, body: json })
      } catch {
        // Could show toast
      }
      setIsEditing(false)
    },
    [comment._id, updateComment]
  )

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
            <span className="text-xs text-muted-foreground italic">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <CommentEditEditor
            initialBody={comment.body}
            onSave={handleSaveEdit}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="mt-0.5">
            <CommentBody body={comment.body} />
          </div>
        )}

        {!isEditing && (
          <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAuthor && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsEditing(true)}
                aria-label="Edit comment"
              >
                <Pencil className="size-3" />
              </Button>
            )}
            {isAuthor && (
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
                    <AlertDialogAction variant="destructive" onClick={handleDelete}>
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
