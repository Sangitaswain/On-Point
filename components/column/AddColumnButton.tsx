'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSocket } from '@/components/providers/SocketProvider'

interface AddColumnButtonProps {
  boardId: Id<'boards'>
  canEdit?: boolean
}

export function AddColumnButton({ boardId, canEdit = true }: AddColumnButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const createColumn = useMutation(api.columns.createColumn)
  const socket = useSocket()

  const handleSave = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    const column = await createColumn({ boardId, title: trimmed })
    socket?.emit('COLUMN_CREATED', { boardId, column })
    setTitle('')
    setIsOpen(false)
  }, [title, boardId, createColumn, socket])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSave()
      } else if (e.key === 'Escape') {
        setTitle('')
        setIsOpen(false)
      }
    },
    [handleSave]
  )

  const handleCancel = useCallback(() => {
    setTitle('')
    setIsOpen(false)
  }, [])

  if (!canEdit) return null

  if (!isOpen) {
    return (
      <button
        type="button"
        className="flex w-72 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 p-4 text-sm text-muted-foreground transition hover:border-muted-foreground/50 hover:text-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-4" />
        Add column
      </button>
    )
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/50 p-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Column title..."
        className="text-sm"
        autoFocus
      />
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
          Add column
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleCancel} aria-label="Cancel">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
