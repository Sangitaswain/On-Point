'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { History } from 'lucide-react'

interface CardHistoryTabProps {
  cardId: Id<'cards'>
}

function relativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatFieldName(field: string): string {
  const map: Record<string, string> = {
    title: 'Title',
    description: 'Description',
    assigneeId: 'Assignee',
    dueDate: 'Due date',
    labels: 'Labels',
    columnId: 'Column',
  }
  return map[field] ?? field
}

export function CardHistoryTab({ cardId }: CardHistoryTabProps) {
  const history = useQuery(api.cards.getHistory, { cardId })

  if (!history) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
        <History className="size-8 opacity-50" />
        <p className="text-sm">No changes recorded yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {history.map((entry) => (
        <div
          key={entry._id}
          className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex size-1.5 rounded-full bg-muted-foreground/50" />
            <span>
              <span className="font-medium">
                {formatFieldName(entry.field)}
              </span>{' '}
              changed
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {relativeTime(entry._creationTime)}
          </span>
        </div>
      ))}
    </div>
  )
}
