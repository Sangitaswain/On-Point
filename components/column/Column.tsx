'use client'

import { useMemo } from 'react'
import { Id } from '@/convex/_generated/dataModel'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ColumnHeader } from '@/components/column/ColumnHeader'
import { CardItem } from '@/components/card/CardItem'
import { AddCardInput } from '@/components/card/AddCardInput'

// Matches design: column colors per position
const COLUMN_COLORS = [
  '#5A5F74', // Backlog — muted
  '#6366F1', // In Progress — indigo
  '#F59E0B', // Review — amber
  '#10B981', // Done — green
  '#EC4899', // extra
  '#8B5CF6', // extra
  '#0891b2', // extra
]

interface ColumnProps {
  column: {
    _id: Id<'columns'>
    title: string
    orderIndex: number
  }
  cards: Array<{
    _id: Id<'cards'>
    columnId: Id<'columns'>
    title: string
    assigneeId?: Id<'users'>
    assigneeName?: string
    assigneeAvatarUrl?: string
    dueDate?: string
    orderIndex: number
    labels?: Array<{ label: string; color: string }>
  }>
  boardId: Id<'boards'>
  onCardClick: (cardId: Id<'cards'>) => void
  canEdit?: boolean
  columnIndex?: number
}

export function Column({ column, cards, boardId, onCardClick, canEdit = true, columnIndex = 0 }: ColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column._id,
    data: { type: 'column' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const cardIds = useMemo(() => cards.map((c) => c._id), [cards])
  const accentColor = COLUMN_COLORS[columnIndex % COLUMN_COLORS.length]

  return (
    // Design: width 292px, surface bg (#13161D), 1px border, 12px radius
    <div
      ref={setNodeRef}
      style={{
        ...style,
        width: 292,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#13161D',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.07)',
        maxHeight: '100%',
      }}
    >
      <ColumnHeader
        column={column}
        boardId={boardId}
        dragListeners={canEdit ? listeners : undefined}
        dragAttributes={canEdit ? attributes : undefined}
        canEdit={canEdit}
        accentColor={accentColor}
        cardCount={cards.length}
      />

      {/* Cards area */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2px 10px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {cards.map((card) => (
            <CardItem
              key={card._id}
              card={card}
              onClick={() => onCardClick(card._id)}
              canEdit={canEdit}
            />
          ))}
        </div>
      </SortableContext>

      <div style={{ padding: '0 10px 10px' }}>
        <AddCardInput columnId={column._id} boardId={boardId} canEdit={canEdit} />
      </div>
    </div>
  )
}
