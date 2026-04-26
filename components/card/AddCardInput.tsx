'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
    else if (e.key === 'Escape') { setTitle(''); setIsOpen(false) }
  }, [handleSave])

  if (!canEdit) return null

  if (!isOpen) {
    return (
      // Design: dashed border button, hover → accent color
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          width: '100%',
          padding: '8px',
          background: 'none',
          border: '1px dashed rgba(255,255,255,0.07)',
          borderRadius: 6,
          color: '#5A5F74',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget
          el.style.borderColor = 'oklch(62% 0.22 263)'
          el.style.color = 'oklch(62% 0.22 263)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget
          el.style.borderColor = 'rgba(255,255,255,0.07)'
          el.style.color = '#5A5F74'
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add card
      </button>
    )
  }

  return (
    <div style={{ background: '#1A1E2A', border: '1px solid oklch(62% 0.22 263)', borderRadius: 6, padding: 10 }}>
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Card title…"
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          resize: 'none',
          color: '#E4E7F0',
          fontSize: 13,
          fontFamily: 'inherit',
          outline: 'none',
          minHeight: 60,
        }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          onClick={handleSave}
          style={{
            padding: '5px 12px',
            background: 'oklch(62% 0.22 263)',
            border: 'none',
            borderRadius: 5,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Add
        </button>
        <button
          onClick={() => { setTitle(''); setIsOpen(false) }}
          style={{
            padding: '5px 10px',
            background: '#222638',
            border: 'none',
            borderRadius: 5,
            color: '#9499AE',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
