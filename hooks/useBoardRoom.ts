import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useSocket } from '@/components/providers/SocketProvider'
import { Doc, Id } from '@/convex/_generated/dataModel'

type Card = Doc<'cards'>
type Column = Doc<'columns'>

interface UseBoardRoomOptions {
  boardId: Id<'boards'>
  onCardCreated?: (card: Card) => void
  onCardUpdated?: (data: { cardId: string; changes: Partial<Card> }) => void
  onCardMoved?: (data: { cardId: string; newColumnId: string; newOrderIndex: number }) => void
  onCardDeleted?: (data: { cardId: string }) => void
  onCardDragging?: (data: { cardId: string; newColumnId: string; newOrderIndex: number }) => void
  onCardDragCancelled?: (data: { cardId: string; originalColumnId: string; originalOrderIndex: number }) => void
  onColumnCreated?: (column: Column) => void
  onColumnUpdated?: (data: { columnId: string; title: string }) => void
  onColumnDeleted?: (data: { columnId: string }) => void
}

export function useBoardRoom({
  boardId,
  onCardCreated,
  onCardUpdated,
  onCardMoved,
  onCardDeleted,
  onCardDragging,
  onCardDragCancelled,
  onColumnCreated,
  onColumnUpdated,
  onColumnDeleted,
}: UseBoardRoomOptions) {
  const socket = useSocket()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!socket) return

    // Connection state — re-join the board room on every (re)connect
    const onConnect = () => {
      setConnected(true)
      socket.emit('JOIN_BOARD', { boardId })
    }
    const onDisconnect = () => setConnected(false)

    // Join immediately if already connected; otherwise wait for 'connect' event
    if (socket.connected) {
      setConnected(true)
      socket.emit('JOIN_BOARD', { boardId })
    }

    // Board event handlers
    const handleCardCreated = (payload: { card: Card }) => onCardCreated?.(payload.card)
    const handleCardUpdated = (data: { cardId: string; changes: Partial<Card> }) => onCardUpdated?.(data)
    const handleCardMoved = (data: { cardId: string; newColumnId: string; newOrderIndex: number }) => onCardMoved?.(data)
    const handleCardDeleted = (data: { cardId: string }) => onCardDeleted?.(data)
    const handleCardDragging = (data: { cardId: string; newColumnId: string; newOrderIndex: number }) => onCardDragging?.(data)
    const handleCardDragCancelled = (data: { cardId: string; originalColumnId: string; originalOrderIndex: number }) => onCardDragCancelled?.(data)
    const handleColumnCreated = (payload: { column: Column }) => onColumnCreated?.(payload.column)
    const handleColumnUpdated = (data: { columnId: string; title: string }) => onColumnUpdated?.(data)
    const handleColumnDeleted = (data: { columnId: string }) => onColumnDeleted?.(data)
    const handleRateLimited = () => toast.warning("You're sending events too quickly. Slow down.")
    const handleError = (err: { message: string }) => toast.error(err?.message ?? 'Socket error')

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('CARD_CREATED', handleCardCreated)
    socket.on('CARD_UPDATED', handleCardUpdated)
    socket.on('CARD_MOVED', handleCardMoved)
    socket.on('CARD_DELETED', handleCardDeleted)
    socket.on('CARD_DRAGGING', handleCardDragging)
    socket.on('CARD_DRAG_CANCELLED', handleCardDragCancelled)
    socket.on('COLUMN_CREATED', handleColumnCreated)
    socket.on('COLUMN_UPDATED', handleColumnUpdated)
    socket.on('COLUMN_DELETED', handleColumnDeleted)
    socket.on('RATE_LIMITED', handleRateLimited)
    socket.on('error', handleError)

    return () => {
      socket.emit('LEAVE_BOARD', { boardId })
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('CARD_CREATED', handleCardCreated)
      socket.off('CARD_UPDATED', handleCardUpdated)
      socket.off('CARD_MOVED', handleCardMoved)
      socket.off('CARD_DELETED', handleCardDeleted)
      socket.off('CARD_DRAGGING', handleCardDragging)
      socket.off('CARD_DRAG_CANCELLED', handleCardDragCancelled)
      socket.off('COLUMN_CREATED', handleColumnCreated)
      socket.off('COLUMN_UPDATED', handleColumnUpdated)
      socket.off('COLUMN_DELETED', handleColumnDeleted)
      socket.off('RATE_LIMITED', handleRateLimited)
      socket.off('error', handleError)
    }
  }, [socket, boardId, onCardCreated, onCardUpdated, onCardMoved, onCardDeleted, onCardDragging, onCardDragCancelled, onColumnCreated, onColumnUpdated, onColumnDeleted])

  return { connected }
}
