import { verifyToken } from '@clerk/backend'
import type { Socket } from 'socket.io'

export async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('UNAUTHENTICATED'))

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    socket.data.userId = payload.sub
    socket.data.userName = (payload as Record<string, unknown>).name as string ?? payload.sub
    next()
  } catch {
    next(new Error('INVALID_TOKEN'))
  }
}
