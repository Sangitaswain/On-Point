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
}

export function AddCardInput({ columnId, boardId }: AddCardInputProps) {
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

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-4 mr-1" />
        Add card
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Card title..."
        className="text-sm"
        autoFocus
      />
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
          Add
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleCancel} aria-label="Cancel">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
