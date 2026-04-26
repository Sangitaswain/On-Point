'use client'

import { useMemo } from 'react'
import { Id } from '@/convex/_generated/dataModel'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ColumnHeader } from '@/components/column/ColumnHeader'
import { CardItem } from '@/components/card/CardItem'
import { AddCardInput } from '@/components/card/AddCardInput'

const COLUMN_COLORS = [
  '#5A5F74', // Muted grey — Backlog
  '#6366F1', // Indigo — In Progress
  '#F59E0B', // Amber — Review
  '#10B981', // Green — Done
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#0891b2', // Cyan
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-[272px] shrink-0 flex-col rounded-xl bg-card border border-border max-h-full overflow-hidden"
    >
      {/* Color accent strip */}
      <div className="h-0.5 w-full rounded-t-xl" style={{ background: accentColor }} />

      <div className="flex flex-col gap-2 p-2 flex-1 min-h-0">
        <ColumnHeader
          column={column}
          boardId={boardId}
          dragListeners={canEdit ? listeners : undefined}
          dragAttributes={canEdit ? attributes : undefined}
          canEdit={canEdit}
          accentColor={accentColor}
          cardCount={cards.length}
        />

        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5 overflow-y-auto min-h-0 flex-1 pr-0.5">
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

        <AddCardInput columnId={column._id} boardId={boardId} canEdit={canEdit} />
      </div>
    </div>
  )
}
