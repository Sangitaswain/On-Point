'use client'

import { Id } from '@/convex/_generated/dataModel'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar } from 'lucide-react'

interface CardItemProps {
  card: {
    _id: Id<'cards'>
    title: string
    assigneeId?: Id<'users'>
    dueDate?: string
  }
  onClick: () => void
}

function isDueDatePast(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function CardItem({ card, onClick }: CardItemProps) {
  const hasDueDate = !!card.dueDate
  const isPast = hasDueDate && isDueDatePast(card.dueDate!)

  return (
    <button
      type="button"
      className="w-full text-left rounded-lg bg-card p-3 shadow-sm border cursor-pointer hover:border-primary/50 transition"
      onClick={onClick}
    >
      <p className="text-sm font-medium text-foreground line-clamp-2">
        {card.title}
      </p>

      {(hasDueDate || card.assigneeId) && (
        <div className="mt-2 flex items-center gap-2">
          {hasDueDate && (
            <Badge
              variant={isPast ? 'destructive' : 'secondary'}
              className="text-xs gap-1"
            >
              <Calendar className="size-3" />
              {formatDueDate(card.dueDate!)}
            </Badge>
          )}

          {card.assigneeId && (
            <Avatar size="sm" className="ml-auto">
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </button>
  )
}
