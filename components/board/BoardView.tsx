'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useSocket } from '@/components/providers/SocketProvider'
import { useBoardRoom } from '@/hooks/useBoardRoom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'

import { LoadingSpinner } from '@/components/loading-spinner'
import { Column } from '@/components/column/Column'
import { AddColumnButton } from '@/components/column/AddColumnButton'
import { CardModal } from '@/components/card/CardModal'
import { computeOrderIndex } from '@/lib/orderIndex'

interface BoardViewProps {
  boardId: Id<'boards'>
}

export function BoardView({ boardId }: BoardViewProps) {
  const columns = useQuery(api.columns.listByBoard, { boardId })
  const cards = useQuery(api.cards.listByBoard, { boardId })

  const moveCard = useMutation(api.cards.moveCard)
  const reorderColumn = useMutation(api.columns.reorderColumn)

  const socket = useSocket()

  // Card modal state
  const [openCardId, setOpenCardId] = useState<Id<'cards'> | null>(null)

  // Local state for optimistic drag updates
  const [localCards, setLocalCards] = useState<NonNullable<typeof cards>>([])
  const [localColumns, setLocalColumns] = useState<NonNullable<typeof columns>>([])

  // Track drag in a ref so the sync effects don't re-trigger on ref change
  const isDraggingRef = useRef(false)

  // Refs that track the cross-column drag state — avoids stale-closure issues in onDragEnd.
  // onDragOver updates these inside the setLocalCards updater (synchronously, before React re-renders).
  const dragActiveCardIdRef = useRef<string | null>(null)
  const dragSourceColumnRef = useRef<string | null>(null)
  const dragTargetColumnRef = useRef<string | null>(null)
  const dragTargetOrderRef = useRef<number>(0)

  // ── Socket event handlers — update local state when OTHER users make changes ──
  const onRemoteCardMoved = useCallback(
    ({ cardId, newColumnId, newOrderIndex }: { cardId: string; newColumnId: string; newOrderIndex: number }) => {
      if (isDraggingRef.current) return
      setLocalCards((prev) =>
        prev.map((c) =>
          c._id === cardId
            ? { ...c, columnId: newColumnId as Id<'columns'>, orderIndex: newOrderIndex }
            : c
        )
      )
    },
    []
  )

  const onRemoteCardUpdated = useCallback(
    ({ cardId, changes }: { cardId: string; changes: Record<string, unknown> }) => {
      setLocalCards((prev) =>
        prev.map((c) => (c._id === cardId ? { ...c, ...changes } : c))
      )
    },
    []
  )

  const onRemoteCardDeleted = useCallback(
    ({ cardId }: { cardId: string }) => {
      setLocalCards((prev) => prev.filter((c) => c._id !== cardId))
      setOpenCardId((prev) => (prev === cardId ? null : prev))
    },
    []
  )

  const onRemoteColumnUpdated = useCallback(
    ({ columnId, title, newOrderIndex }: { columnId: string; title?: string; newOrderIndex?: number }) => {
      setLocalColumns((prev) =>
        prev.map((c) => {
          if (c._id !== columnId) return c
          return {
            ...c,
            ...(title !== undefined ? { title } : {}),
            ...(newOrderIndex !== undefined ? { orderIndex: newOrderIndex } : {}),
          }
        })
      )
    },
    []
  )

  const onRemoteColumnDeleted = useCallback(
    ({ columnId }: { columnId: string }) => {
      setLocalColumns((prev) => prev.filter((c) => c._id !== columnId))
      setLocalCards((prev) => prev.filter((c) => (c.columnId as string) !== columnId))
    },
    []
  )

  const onRemoteCardCreated = useCallback(
    (card: NonNullable<typeof cards>[number]) => {
      setLocalCards((prev) =>
        prev.some((c) => c._id === card._id) ? prev : [...prev, card]
      )
    },
    []
  )

  const onRemoteColumnCreated = useCallback(
    (column: NonNullable<typeof columns>[number]) => {
      setLocalColumns((prev) =>
        prev.some((c) => c._id === column._id) ? prev : [...prev, column]
      )
    },
    []
  )

  // Observer: another user is dragging a card cross-column — preview it
  const onRemoteCardDragging = useCallback(
    ({ cardId, newColumnId, newOrderIndex }: { cardId: string; newColumnId: string; newOrderIndex: number }) => {
      setLocalCards((prev) =>
        prev.map((c) =>
          c._id === cardId
            ? { ...c, columnId: newColumnId as Id<'columns'>, orderIndex: newOrderIndex }
            : c
        )
      )
    },
    []
  )

  // Observer: dragger cancelled — restore card to its original position
  const onRemoteCardDragCancelled = useCallback(
    ({ cardId, originalColumnId, originalOrderIndex }: { cardId: string; originalColumnId: string; originalOrderIndex: number }) => {
      setLocalCards((prev) =>
        prev.map((c) =>
          c._id === cardId
            ? { ...c, columnId: originalColumnId as Id<'columns'>, orderIndex: originalOrderIndex }
            : c
        )
      )
    },
    []
  )

  const { connected } = useBoardRoom({
    boardId,
    onCardCreated: onRemoteCardCreated,
    onCardMoved: onRemoteCardMoved,
    onCardUpdated: onRemoteCardUpdated,
    onCardDeleted: onRemoteCardDeleted,
    onCardDragging: onRemoteCardDragging,
    onCardDragCancelled: onRemoteCardDragCancelled,
    onColumnCreated: onRemoteColumnCreated,
    onColumnUpdated: onRemoteColumnUpdated,
    onColumnDeleted: onRemoteColumnDeleted,
  })

  // Active drag item id (for DragOverlay)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // Sync Convex data → local state (skipped while dragging)
  useEffect(() => {
    if (!isDraggingRef.current && cards) setLocalCards([...cards])
  }, [cards])

  useEffect(() => {
    if (!isDraggingRef.current && columns) setLocalColumns([...columns])
  }, [columns])

  // Sorted columns and column IDs for SortableContext
  const sortedColumns = useMemo(
    () => [...localColumns].sort((a, b) => a.orderIndex - b.orderIndex),
    [localColumns]
  )
  const columnIds = useMemo(() => sortedColumns.map((c) => c._id), [sortedColumns])

  // Cards grouped by column (from local state, sorted by orderIndex)
  const cardsByColumn = useMemo(() => {
    const map: Record<string, NonNullable<typeof cards>> = {}
    for (const card of localCards) {
      const key = card.columnId as string
      if (!map[key]) map[key] = []
      map[key].push(card)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.orderIndex - b.orderIndex)
    }
    return map
  }, [localCards])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Store the card's original orderIndex so we can revert on cancel for observers
  const dragSourceOrderRef = useRef<number>(0)

  // Record where the drag started so onDragEnd can detect cross-column moves
  // regardless of whether its closure is stale.
  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    isDraggingRef.current = true
    setActiveDragId(active.id as string)
    const card = localCards.find((c) => c._id === (active.id as string))
    dragActiveCardIdRef.current = active.id as string
    dragSourceColumnRef.current = card ? (card.columnId as string) : null
    dragTargetColumnRef.current = card ? (card.columnId as string) : null
    dragTargetOrderRef.current = card ? card.orderIndex : 0
    dragSourceOrderRef.current = card ? card.orderIndex : 0
  }, [localCards])

  // Called on pointer move — handle cross-column card moves for visual preview.
  // IMPORTANT: refs are updated INSIDE the setLocalCards updater so the values
  // are always current when onDragEnd reads them (before React re-renders).
  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return
    if (active.data.current?.type !== 'card') return

    // Capture the drag preview payload here so we can emit it after setLocalCards.
    // We use an object so we can mutate it from inside the updater.
    const dragPayload = { shouldEmit: false, cardId: '', newColumnId: '', newOrderIndex: 0 }

    setLocalCards((prev) => {
      const activeCard = prev.find((c) => c._id === active.id)
      if (!activeCard) return prev

      const overCard = prev.find((c) => c._id === over.id)
      const newColumnId: string = overCard
        ? (overCard.columnId as string)
        : (over.id as string)

      // Only handle cross-column moves here; within-column handled in onDragEnd
      if ((activeCard.columnId as string) === newColumnId) return prev

      const destCards = prev
        .filter((c) => (c.columnId as string) === newColumnId && c._id !== active.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)

      let newOrderIndex: number
      if (overCard) {
        const overIdx = destCards.findIndex((c) => c._id === over.id)
        newOrderIndex = computeOrderIndex(
          destCards[overIdx - 1]?.orderIndex,
          destCards[overIdx]?.orderIndex
        )
      } else {
        const last = destCards[destCards.length - 1]?.orderIndex
        newOrderIndex = computeOrderIndex(last, undefined)
      }

      // Keep refs in sync so onDragEnd always has the correct target — even if
      // React hasn't re-rendered yet and onDragEnd's closure is stale.
      dragTargetColumnRef.current = newColumnId
      dragTargetOrderRef.current = newOrderIndex

      // Mark payload for emission after this updater returns
      dragPayload.shouldEmit = true
      dragPayload.cardId = active.id as string
      dragPayload.newColumnId = newColumnId
      dragPayload.newOrderIndex = newOrderIndex

      return prev.map((c) =>
        c._id === active.id
          ? { ...c, columnId: newColumnId as Id<'columns'>, orderIndex: newOrderIndex }
          : c
      )
    })

    // Emit live drag preview to observers (outside the updater — socket is not available inside)
    if (dragPayload.shouldEmit) {
      socket?.emit('CARD_DRAGGING', {
        boardId,
        cardId: dragPayload.cardId,
        newColumnId: dragPayload.newColumnId,
        newOrderIndex: dragPayload.newOrderIndex,
      })
    }
  }, [socket, boardId])

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      isDraggingRef.current = false
      setActiveDragId(null)

      if (!over) {
        // Cancelled — revert
        dragActiveCardIdRef.current = null
        dragSourceColumnRef.current = null
        dragTargetColumnRef.current = null
        if (cards) setLocalCards([...cards])
        if (columns) setLocalColumns([...columns])
        return
      }

      const activeType = active.data.current?.type

      if (activeType === 'card') {
        const activeId = active.id as string

        // Use refs for cross-column detection: refs are updated synchronously inside
        // the setLocalCards updater in onDragOver, so they're never stale here.
        const isCrossColumn =
          dragSourceColumnRef.current !== null &&
          dragTargetColumnRef.current !== null &&
          dragSourceColumnRef.current !== dragTargetColumnRef.current

        if (isCrossColumn) {
          const newColumnId = dragTargetColumnRef.current as Id<'columns'>
          const newOrderIndex = dragTargetOrderRef.current

          moveCard({
            cardId: activeId as Id<'cards'>,
            newColumnId,
            newOrderIndex,
          }).then(() => {
            socket?.emit('CARD_MOVED', {
              boardId,
              cardId: activeId,
              newColumnId: newColumnId as string,
              newOrderIndex,
            })
          }).catch(() => {
            if (cards) setLocalCards([...cards])
          })

          dragActiveCardIdRef.current = null
          dragSourceColumnRef.current = null
          dragTargetColumnRef.current = null
          return
        }

        // Within-column reorder
        const overId = over.id as string
        if (activeId === overId) return

        const activeCard = localCards.find((c) => c._id === activeId)
        if (!activeCard) return

        const columnCards = localCards
          .filter((c) => c.columnId === activeCard.columnId)
          .sort((a, b) => a.orderIndex - b.orderIndex)

        const oldIdx = columnCards.findIndex((c) => c._id === activeId)
        const newIdx = columnCards.findIndex((c) => c._id === overId)
        if (oldIdx === -1 || newIdx === -1) return

        const reordered = arrayMove(columnCards, oldIdx, newIdx)
        const movedIdx = reordered.findIndex((c) => c._id === activeId)
        const newOrderIndex = computeOrderIndex(
          reordered[movedIdx - 1]?.orderIndex,
          reordered[movedIdx + 1]?.orderIndex
        )

        setLocalCards((prev) =>
          prev.map((c) => (c._id === activeId ? { ...c, orderIndex: newOrderIndex } : c))
        )

        moveCard({
          cardId: activeId as Id<'cards'>,
          newColumnId: activeCard.columnId,
          newOrderIndex,
        }).then(() => {
          socket?.emit('CARD_MOVED', {
            boardId,
            cardId: activeId,
            newColumnId: activeCard.columnId as string,
            newOrderIndex,
          })
        }).catch(() => {
          if (cards) setLocalCards([...cards])
        })
      } else if (activeType === 'column') {
        const activeId = active.id as string
        const overId = over.id as string
        if (activeId === overId) return

        const sortedCols = [...localColumns].sort((a, b) => a.orderIndex - b.orderIndex)
        const oldIdx = sortedCols.findIndex((c) => c._id === activeId)
        const newIdx = sortedCols.findIndex((c) => c._id === overId)
        if (oldIdx === -1 || newIdx === -1) return

        const reordered = arrayMove(sortedCols, oldIdx, newIdx)
        const movedIdx = reordered.findIndex((c) => c._id === activeId)
        const newOrderIndex = computeOrderIndex(
          reordered[movedIdx - 1]?.orderIndex,
          reordered[movedIdx + 1]?.orderIndex
        )

        setLocalColumns((prev) =>
          prev.map((c) => (c._id === activeId ? { ...c, orderIndex: newOrderIndex } : c))
        )

        reorderColumn({
          columnId: activeId as Id<'columns'>,
          newOrderIndex,
        }).then(() => {
          socket?.emit('COLUMN_UPDATED', {
            boardId,
            columnId: activeId,
            newOrderIndex,
          })
        }).catch(() => {
          if (columns) setLocalColumns([...columns])
        })
      }
    },
    [localCards, localColumns, cards, columns, moveCard, reorderColumn, socket, boardId]
  )

  const onDragCancel = useCallback(() => {
    isDraggingRef.current = false
    setActiveDragId(null)

    // Notify observers to revert their drag preview
    if (dragActiveCardIdRef.current && dragSourceColumnRef.current !== null) {
      socket?.emit('CARD_DRAG_CANCELLED', {
        boardId,
        cardId: dragActiveCardIdRef.current,
        originalColumnId: dragSourceColumnRef.current,
        originalOrderIndex: dragSourceOrderRef.current,
      })
    }

    dragActiveCardIdRef.current = null
    dragSourceColumnRef.current = null
    dragTargetColumnRef.current = null
    if (cards) setLocalCards([...cards])
    if (columns) setLocalColumns([...columns])
  }, [cards, columns, socket, boardId])

  // DragOverlay content
  const activeCard = activeDragId ? localCards.find((c) => c._id === activeDragId) : null
  const activeColumn = activeDragId ? localColumns.find((c) => c._id === activeDragId) : null

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
      {!connected && socket !== null && (
        <div className="flex items-center justify-center bg-yellow-500/10 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400">
          You are offline. Reconnecting...
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-1 gap-4 overflow-x-auto p-4 pb-6">
            {sortedColumns.map((column) => (
              <Column
                key={column._id}
                column={column}
                boardId={boardId}
                cards={cardsByColumn[column._id as string] ?? []}
                onCardClick={(cardId) => setOpenCardId(cardId)}
              />
            ))}
            <AddColumnButton boardId={boardId} />
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCard && (
            <div className="w-72 rotate-1 rounded-lg border border-primary bg-card px-3 py-2.5 shadow-2xl opacity-95">
              <p className="text-sm font-medium text-foreground line-clamp-2">
                {activeCard.title}
              </p>
            </div>
          )}
          {!activeCard && activeColumn && (
            <div className="w-72 rounded-xl border-2 border-primary bg-muted/80 p-2 shadow-2xl opacity-90">
              <div className="px-2 py-1 text-sm font-semibold text-foreground">
                {activeColumn.title}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {openCardId && (
        <CardModal
          cardId={openCardId}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </>
  )
}
