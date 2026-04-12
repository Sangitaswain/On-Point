import type { Socket } from 'socket.io'

// boardId → Map<userId, { userName }>
const presenceStore = new Map<string, Map<string, { userName: string }>>()

export function addToPresence(boardId: string, userId: string, userName: string) {
  if (!presenceStore.has(boardId)) presenceStore.set(boardId, new Map())
  presenceStore.get(boardId)!.set(userId, { userName })
}

export function removeFromPresence(boardId: string, userId: string) {
  presenceStore.get(boardId)?.delete(userId)
  if (presenceStore.get(boardId)?.size === 0) presenceStore.delete(boardId)
}

export function getPresence(boardId: string) {
  const board = presenceStore.get(boardId)
  if (!board) return []
  return Array.from(board.entries()).map(([userId, data]) => ({
    userId,
    userName: data.userName,
  }))
}

export function handleLeaveBoard(socket: Socket, boardId: string) {
  socket.leave(`board:${boardId}`)
  removeFromPresence(boardId, socket.data.userId)
  socket.to(`board:${boardId}`).emit('PRESENCE_UPDATE', {
    type: 'LEAVE',
    userId: socket.data.userId,
  })
}
