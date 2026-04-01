'use client'

import { Id } from '@/convex/_generated/dataModel'
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
    title: string
    assigneeId?: Id<'users'>
    dueDate?: string
    orderIndex: number
  }>
  onCardClick: (cardId: Id<'cards'>) => void
}

export function Column({ column, cards, onCardClick }: ColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/50 p-2 max-h-full">
      <ColumnHeader column={column} />
      <div className="flex flex-col gap-2 overflow-y-auto min-h-0 flex-1">
        {cards.map((card) => (
          <CardItem
            key={card._id}
            card={card}
            onClick={() => onCardClick(card._id)}
          />
        ))}
      </div>
      <AddCardInput columnId={column._id} />
    </div>
  )
}
