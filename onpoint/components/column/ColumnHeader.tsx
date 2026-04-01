'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DeleteColumnDialog } from '@/components/column/DeleteColumnDialog'

interface ColumnHeaderProps {
  column: {
    _id: Id<'columns'>
    title: string
  }
}

export function ColumnHeader({ column }: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(column.title)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const updateColumn = useMutation(api.columns.updateColumn)

  const handleSave = useCallback(() => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== column.title) {
      updateColumn({ columnId: column._id, title: trimmed })
    } else {
      setTitle(column.title)
    }
    setIsEditing(false)
  }, [title, column.title, column._id, updateColumn])

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
    <div className="flex items-center justify-between px-2 py-1">
      {isEditing ? (
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
          onClick={() => {
            setIsEditing(true)
            setTitle(column.title)
          }}
        >
          {column.title}
        </button>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        className="ml-1 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
        aria-label="Delete column"
      >
        <Trash2 className="size-3.5" />
      </Button>
      <DeleteColumnDialog
        column={column}
        cardCount={0}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}
