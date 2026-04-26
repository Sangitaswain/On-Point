'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave()
    else if (e.key === 'Escape') { setTitle(''); setIsOpen(false) }
  }, [handleSave])

  if (!canEdit) return null

  if (!isOpen) {
    return (
      // Design: 240px wide, surface bg, dashed border, 12px radius
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          width: 240,
          flexShrink: 0,
          padding: '12px 16px',
          background: '#13161D',
          border: '1px dashed rgba(255,255,255,0.07)',
          borderRadius: 12,
          color: '#5A5F74',
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget
          el.style.borderColor = 'rgba(255,255,255,0.12)'
          el.style.color = '#9499AE'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget
          el.style.borderColor = 'rgba(255,255,255,0.07)'
          el.style.color = '#5A5F74'
        }}
      >
        <span style={{ fontSize: 18 }}>+</span> Add column
      </button>
    )
  }

  return (
    <div style={{ width: 240, flexShrink: 0, background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 12 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Column title…"
        autoFocus
        style={{
          width: '100%',
          background: '#222638',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6,
          padding: '7px 10px',
          color: '#E4E7F0',
          fontSize: 13,
          outline: 'none',
          fontFamily: 'inherit',
          marginBottom: 8,
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          style={{ padding: '5px 14px', background: 'oklch(62% 0.22 263)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: 1 }}
        >
          Add column
        </button>
        <button
          onClick={() => { setTitle(''); setIsOpen(false) }}
          style={{ padding: '5px 10px', background: '#222638', border: 'none', borderRadius: 6, color: '#9499AE', fontSize: 12, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
