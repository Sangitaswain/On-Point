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
      if (e.key === 'Enter') handleSave()
      else if (e.key === 'Escape') { setTitle(''); setIsOpen(false) }
    },
    [handleSave]
  )

  if (!canEdit) return null

  if (!isOpen) {
    return (
      <button
        type="button"
        className="flex w-[272px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground p-4 transition-all hover:border-primary/40 hover:text-primary hover:bg-primary/5"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-4" />
        Add column
      </button>
    )
  }

  return (
    <div className="flex w-[272px] shrink-0 flex-col gap-2 rounded-xl bg-card border border-border p-3 animate-slide-in">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Column title…"
        className="text-sm h-8"
        autoFocus
      />
      <div className="flex items-center gap-1.5">
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSave} disabled={!title.trim()}>
          Add column
        </Button>
        <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => { setTitle(''); setIsOpen(false) }} aria-label="Cancel">
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
