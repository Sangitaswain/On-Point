import type { Socket } from 'socket.io'
import { addToPresence, getPresence, handleLeaveBoard } from '../presence'
import { checkRateLimit } from '../rateLimit'

export function handleConnection(socket: Socket) {
  // ─── Board Room Events ───────────────────────────────────────────

  socket.on('JOIN_BOARD', ({ boardId }: { boardId: string }) => {
    socket.join(`board:${boardId}`)
    socket.data.currentBoardId = boardId

    addToPresence(boardId, socket.data.userId, socket.data.userName)
    socket.emit('PRESENCE_INIT', getPresence(boardId))
    socket.to(`board:${boardId}`).emit('PRESENCE_UPDATE', {
      type: 'JOIN',
      userId: socket.data.userId,
      userName: socket.data.userName,
    })
  })

  socket.on('LEAVE_BOARD', ({ boardId }: { boardId: string }) => {
    handleLeaveBoard(socket, boardId)
  })

  socket.on('disconnect', () => {
    const boardId = socket.data.currentBoardId
    if (boardId) handleLeaveBoard(socket, boardId)
  })

  // ─── Card Events ─────────────────────────────────────────────────

  socket.on('CARD_CREATED', (payload: { boardId: string }) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('CARD_CREATED', payload)
    })
  })

  socket.on('CARD_UPDATED', (payload: { boardId: string }) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('CARD_UPDATED', payload)
    })
  })

  socket.on('CARD_MOVED', (payload: { boardId: string }) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('CARD_MOVED', payload)
    })
  })

  socket.on('CARD_DELETED', (payload: { boardId: string }) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('CARD_DELETED', payload)
    })
  })

  // ─── Column Events ───────────────────────────────────────────────

  socket.on('COLUMN_CREATED', (payload: { boardId: string }) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('COLUMN_CREATED', payload)
    })
  })

  socket.on('COLUMN_UPDATED', (payload: { boardId: string }) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('COLUMN_UPDATED', payload)
    })
  })

  socket.on('COLUMN_DELETED', (payload: { boardId: string }) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${payload.boardId}`).emit('COLUMN_DELETED', payload)
    })
  })

  // ─── Drag Preview Events (no rate limit — high-frequency position updates) ──

  socket.on('CARD_DRAGGING', (payload: { boardId: string }) => {
    socket.to(`board:${payload.boardId}`).emit('CARD_DRAGGING', payload)
  })

  socket.on('CARD_DRAG_CANCELLED', (payload: { boardId: string }) => {
    socket.to(`board:${payload.boardId}`).emit('CARD_DRAG_CANCELLED', payload)
  })

  // ─── Chat Events ─────────────────────────────────────────────────

  socket.on('TYPING_START', ({ boardId }: { boardId: string }) => {
    socket.to(`board:${boardId}`).emit('TYPING_START', {
      userId: socket.data.userId,
      userName: socket.data.userName,
    })
  })

  socket.on('TYPING_STOP', ({ boardId }: { boardId: string }) => {
    socket.to(`board:${boardId}`).emit('TYPING_STOP', {
      userId: socket.data.userId,
    })
  })

  socket.on('CHAT_MESSAGE_SENT', ({ boardId }: { boardId: string }) => {
    checkRateLimit(socket, () => {
      socket.to(`board:${boardId}`).emit('CHAT_MESSAGE_SENT', {
        boardId,
        sentBy: socket.data.userId,
      })
    })
  })
}
