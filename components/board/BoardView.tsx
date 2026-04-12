'use client'

import { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

import { LoadingSpinner } from '@/components/loading-spinner'
import { Column } from '@/components/column/Column'
import { AddColumnButton } from '@/components/column/AddColumnButton'
import { CardModal } from '@/components/card/CardModal'

interface BoardViewProps {
  boardId: Id<'boards'>
}

export function BoardView({ boardId }: BoardViewProps) {
  const columns = useQuery(api.columns.listByBoard, { boardId })
  const cards = useQuery(api.cards.listByBoard, { boardId })

  // Card modal state — wired in Step 6
  const [openCardId, setOpenCardId] = useState<Id<'cards'> | null>(null)

  // Group cards by columnId for efficient lookup
  const cardsByColumn = useMemo(() => {
    if (!cards) return {}
    const map: Record<string, typeof cards> = {}
    for (const card of cards) {
      const key = card.columnId as string
      if (!map[key]) {
        map[key] = []
      }
      map[key].push(card)
    }
    // Sort each column's cards by orderIndex
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.orderIndex - b.orderIndex)
    }
    return map
  }, [cards])

  // Loading state
  if (columns === undefined || cards === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Loading board...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-1 gap-4 overflow-x-auto p-4 pb-6">
        {columns.map((column) => (
          <Column
            key={column._id}
            column={column}
            cards={cardsByColumn[column._id as string] ?? []}
            onCardClick={(cardId) => setOpenCardId(cardId)}
          />
        ))}
        <AddColumnButton boardId={boardId} />
      </div>

      {openCardId && (
        <CardModal
          cardId={openCardId}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </>
  )
}
