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
    // Prefer the name sent by the client SDK (always has the full profile);
    // fall back to the JWT name claim, then the Clerk user ID.
    const jwtName = (payload as Record<string, unknown>).name as string | undefined
    socket.data.userName =
      (socket.handshake.auth?.userName as string | undefined) ??
      jwtName ??
      payload.sub
    next()
  } catch {
    next(new Error('INVALID_TOKEN'))
  }
}
