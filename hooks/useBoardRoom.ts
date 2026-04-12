import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useSocket } from '@/components/providers/SocketProvider'
import { Id } from '@/convex/_generated/dataModel'

type Card = {
  _id: Id<'cards'>
  columnId: Id<'columns'>
  boardId: Id<'boards'>
  title: string
  orderIndex: number
  description?: unknown
  assigneeId?: Id<'users'>
  dueDate?: string
  labels?: { _id: string; cardId: string; label: string; color: string }[]
}

type Column = {
  _id: Id<'columns'>
  boardId: Id<'boards'>
  title: string
  orderIndex: number
}

interface UseBoardRoomOptions {
  boardId: Id<'boards'>
  onCardCreated?: (card: Card) => void
  onCardUpdated?: (data: { cardId: string; changes: Partial<Card> }) => void
  onCardMoved?: (data: { cardId: string; newColumnId: string; newOrderIndex: number }) => void
  onCardDeleted?: (data: { cardId: string }) => void
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
  onColumnCreated,
  onColumnUpdated,
  onColumnDeleted,
}: UseBoardRoomOptions) {
  const socket = useSocket()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!socket) return

    // Join the board room
    socket.emit('JOIN_BOARD', { boardId })

    // Connection state
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    setConnected(socket.connected)

    // Board event handlers
    const handleCardCreated = (card: Card) => onCardCreated?.(card)
    const handleCardUpdated = (data: { cardId: string; changes: Partial<Card> }) => onCardUpdated?.(data)
    const handleCardMoved = (data: { cardId: string; newColumnId: string; newOrderIndex: number }) => onCardMoved?.(data)
    const handleCardDeleted = (data: { cardId: string }) => onCardDeleted?.(data)
    const handleColumnCreated = (column: Column) => onColumnCreated?.(column)
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
      socket.off('COLUMN_CREATED', handleColumnCreated)
      socket.off('COLUMN_UPDATED', handleColumnUpdated)
      socket.off('COLUMN_DELETED', handleColumnDeleted)
      socket.off('RATE_LIMITED', handleRateLimited)
      socket.off('error', handleError)
    }
  }, [socket, boardId, onCardCreated, onCardUpdated, onCardMoved, onCardDeleted, onColumnCreated, onColumnUpdated, onColumnDeleted])

  return { connected }
}
