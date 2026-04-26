'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { GripVertical, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DeleteColumnDialog } from '@/components/column/DeleteColumnDialog'
import { useSocket } from '@/components/providers/SocketProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ColumnHeaderProps {
  column: { _id: Id<'columns'>; title: string }
  boardId: Id<'boards'>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragListeners?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragAttributes?: Record<string, any>
  canEdit?: boolean
  accentColor?: string
  cardCount?: number
}

export function ColumnHeader({
  column, boardId, dragListeners, dragAttributes,
  canEdit = true, accentColor = '#6366F1', cardCount = 0,
}: ColumnHeaderProps) {
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave()
    else if (e.key === 'Escape') { setTitle(column.title); setIsEditing(false) }
  }, [handleSave, column.title])

  return (
    <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Drag handle — separate element, not on the whole row */}
      {dragListeners && (
        <button
          type="button"
          {...dragListeners}
          {...dragAttributes}
          style={{ background: 'none', border: 'none', cursor: 'grab', color: '#5A5F74', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center' }}
          aria-label="Drag column"
        >
          <GripVertical size={14} />
        </button>
      )}

      {/* Colored dot */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />

      {/* Title */}
      {canEdit && isEditing ? (
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-6 text-xs font-semibold flex-1 min-w-0"
          autoFocus
        />
      ) : (
        <button
          type="button"
          className="flex-1 truncate text-left"
          style={{ fontWeight: 600, fontSize: 13, color: '#E4E7F0', background: 'none', border: 'none', cursor: canEdit ? 'text' : 'default', padding: 0 }}
          onClick={canEdit ? () => { setIsEditing(true); setTitle(column.title) } : undefined}
        >
          {column.title}
        </button>
      )}

      {/* Card count badge */}
      <div style={{
        marginLeft: 'auto', width: 20, height: 20, borderRadius: 5,
        background: '#222638', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600, color: '#5A5F74', flexShrink: 0,
      }}>
        {cardCount}
      </div>

      {/* ⋯ menu — uses a div trigger to avoid button-in-button */}
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div
              role="button"
              tabIndex={0}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5F74', fontSize: 16, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}
              aria-label="Column options"
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            >
              ⋯
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-3.5" />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
