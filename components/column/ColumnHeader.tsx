'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DeleteColumnDialog } from '@/components/column/DeleteColumnDialog'
import { useSocket } from '@/components/providers/SocketProvider'

interface ColumnHeaderProps {
  column: {
    _id: Id<'columns'>
    title: string
  }
  boardId: Id<'boards'>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragListeners?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragAttributes?: Record<string, any>
  canEdit?: boolean
}

export function ColumnHeader({ column, boardId, dragListeners, dragAttributes, canEdit = true }: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(column.title)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const updateColumn = useMutation(api.columns.updateColumn)
  const socket = useSocket()

  const handleSave = useCallback(() => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== column.title) {
      updateColumn({ columnId: column._id, title: trimmed }).then(() => {
        socket?.emit('COLUMN_UPDATED', { boardId, columnId: column._id, title: trimmed })
      })
    } else {
      setTitle(column.title)
    }
    setIsEditing(false)
  }, [title, column.title, column._id, boardId, updateColumn, socket])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSave()
      } else if (e.key === 'Escape') {
        setTitle(column.title)
        setIsEditing(false)
      }
    },
    [handleSave, column.title]
  )

  return (
    <div className="flex items-center justify-between px-1 py-1">
      {dragListeners && (
        <button
          type="button"
          {...dragListeners}
          {...dragAttributes}
          className="cursor-grab shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-none"
          aria-label="Drag column"
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      {canEdit && isEditing ? (
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm font-semibold"
          autoFocus
        />
      ) : (
        <button
          type="button"
          className="flex-1 truncate text-left text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
          onClick={canEdit ? () => { setIsEditing(true); setTitle(column.title) } : undefined}
        >
          {column.title}
        </button>
      )}
      {canEdit && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-1 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          aria-label="Delete column"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
      <DeleteColumnDialog
        column={column}
        boardId={boardId}
        cardCount={0}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}
