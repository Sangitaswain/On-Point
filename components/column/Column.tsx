'use client'

import { useMemo } from 'react'
import { Id } from '@/convex/_generated/dataModel'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ColumnHeader } from '@/components/column/ColumnHeader'
import { CardItem } from '@/components/card/CardItem'
import { AddCardInput } from '@/components/card/AddCardInput'

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
    dueDate?: string
    orderIndex: number
  }>
  boardId: Id<'boards'>
  onCardClick: (cardId: Id<'cards'>) => void
  canEdit?: boolean
}

export function Column({ column, cards, boardId, onCardClick, canEdit = true }: ColumnProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/50 p-2 max-h-full"
    >
      <ColumnHeader column={column} boardId={boardId} dragListeners={canEdit ? listeners : undefined} dragAttributes={canEdit ? attributes : undefined} canEdit={canEdit} />

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 overflow-y-auto min-h-0 flex-1">
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
  )
}
