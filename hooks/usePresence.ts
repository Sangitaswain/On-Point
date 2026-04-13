import { useEffect, useState } from 'react'
import { useSocket } from '@/components/providers/SocketProvider'
import { Id } from '@/convex/_generated/dataModel'

type PresenceUser = { userId: string; userName: string }

type PresenceInit = PresenceUser[]
type PresenceUpdate =
  | { type: 'JOIN'; userId: string; userName: string }
  | { type: 'LEAVE'; userId: string }

export function usePresence(boardId: Id<'boards'>) {
  const socket = useSocket()
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    if (!socket) return

    const onInit = (payload: PresenceInit) => setUsers(payload)

    const onUpdate = (payload: PresenceUpdate) => {
      if (payload.type === 'JOIN') {
        setUsers((prev) => {
          if (prev.some((u) => u.userId === payload.userId)) return prev
          return [...prev, { userId: payload.userId, userName: payload.userName }]
        })
      } else {
        setUsers((prev) => prev.filter((u) => u.userId !== payload.userId))
      }
    }

    socket.on('PRESENCE_INIT', onInit)
    socket.on('PRESENCE_UPDATE', onUpdate)

    return () => {
      socket.off('PRESENCE_INIT', onInit)
      socket.off('PRESENCE_UPDATE', onUpdate)
    }
  }, [socket, boardId])

  return users
}
