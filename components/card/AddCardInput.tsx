'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSocket } from '@/components/providers/SocketProvider'

interface AddCardInputProps {
  columnId: Id<'columns'>
  boardId: Id<'boards'>
  canEdit?: boolean
}

export function AddCardInput({ columnId, boardId, canEdit = true }: AddCardInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const createCard = useMutation(api.cards.createCard)
  const socket = useSocket()

  const handleSave = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    const card = await createCard({ columnId, title: trimmed })
    socket?.emit('CARD_CREATED', { boardId, card })
    setTitle('')
  }, [title, columnId, boardId, createCard, socket])

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
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors group"
      >
        <Plus className="size-3.5 group-hover:text-primary transition-colors" />
        Add card
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 animate-slide-in">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Card title…"
        className="h-8 text-xs bg-muted/50 border-border/80"
        autoFocus
      />
      <div className="flex items-center gap-1">
        <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSave} disabled={!title.trim()}>
          Add
        </Button>
        <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => { setTitle(''); setIsOpen(false) }} aria-label="Cancel">
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
