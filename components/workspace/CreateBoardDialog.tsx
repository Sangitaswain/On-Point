'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { ConvexError } from 'convex/values'
import { Globe, Lock } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/loading-spinner'
import { cn } from '@/lib/utils'

interface CreateBoardDialogProps {
  workspaceId: Id<'workspaces'>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBoardDialog({
  workspaceId,
  open,
  onOpenChange,
}: CreateBoardDialogProps) {
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<'workspace' | 'private'>(
    'workspace'
  )
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBoard = useMutation(api.boards.createBoard)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      const trimmed = title.trim()
      if (!trimmed) {
        setError('Please enter a board name.')
        return
      }

      setIsCreating(true)
      try {
        await createBoard({
          workspaceId,
          title: trimmed,
          visibility,
        })
        // Reset form and close dialog
        setTitle('')
        setVisibility('workspace')
        setError(null)
        onOpenChange(false)
      } catch (err) {
        if (err instanceof ConvexError) {
          const data = err.data as { message?: string }
          setError(data.message ?? 'Something went wrong. Please try again.')
        } else {
          setError('Something went wrong. Please try again.')
        }
      } finally {
        setIsCreating(false)
      }
    },
    [title, visibility, workspaceId, createBoard, onOpenChange]
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        // Reset form state when closing
        setTitle('')
        setVisibility('workspace')
        setError(null)
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Add a new board to organize your tasks and projects.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-title">Board name</Label>
            <Input
              id="board-title"
              type="text"
              placeholder="e.g. Product Roadmap, Sprint Board"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
              disabled={isCreating}
              autoFocus
              autoComplete="off"
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('workspace')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  visibility === 'workspace'
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:border-border hover:bg-muted/50'
                )}
              >
                <Globe className="size-4 shrink-0" />
                <div>
                  <p className="font-medium">Workspace</p>
                  <p className="text-xs text-muted-foreground">
                    All members can see
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  visibility === 'private'
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:border-border hover:bg-muted/50'
                )}
              >
                <Lock className="size-4 shrink-0" />
                <div>
                  <p className="font-medium">Private</p>
                  <p className="text-xs text-muted-foreground">
                    Invite-only access
                  </p>
                </div>
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isCreating || !title.trim()}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner className="size-4" />
                  Creating...
                </span>
              ) : (
                'Create board'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
