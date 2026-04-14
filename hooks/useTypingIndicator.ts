import { useEffect, useRef, useState } from 'react'
import { useSocket } from '@/components/providers/SocketProvider'
import { Id } from '@/convex/_generated/dataModel'

const TIMEOUT_MS = 3000

export function useTypingIndicator(boardId: Id<'boards'>) {
  const socket = useSocket()
  // Map of userId → userName for currently typing users
  const [typing, setTyping] = useState<Map<string, string>>(new Map())
  // Cleanup timers: userId → timeout id
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    if (!socket) return

    const clearTimer = (userId: string) => {
      const t = timers.current.get(userId)
      if (t) clearTimeout(t)
      timers.current.delete(userId)
    }

    const resetTimer = (userId: string) => {
      clearTimer(userId)
      const t = setTimeout(() => {
        setTyping((prev) => {
          const next = new Map(prev)
          next.delete(userId)
          return next
        })
        timers.current.delete(userId)
      }, TIMEOUT_MS)
      timers.current.set(userId, t)
    }

    const onStart = ({ userId, userName }: { userId: string; userName: string }) => {
      setTyping((prev) => new Map(prev).set(userId, userName))
      resetTimer(userId)
    }

    const onStop = ({ userId }: { userId: string }) => {
      clearTimer(userId)
      setTyping((prev) => {
        const next = new Map(prev)
        next.delete(userId)
        return next
      })
    }

    socket.on('TYPING_START', onStart)
    socket.on('TYPING_STOP', onStop)

    return () => {
      socket.off('TYPING_START', onStart)
      socket.off('TYPING_STOP', onStop)
    }
  }, [socket])

  // Format into a human-readable string
  const names = Array.from(typing.values())
  let label = ''
  if (names.length === 1) label = `${names[0]} is typing...`
  else if (names.length === 2) label = `${names[0]} and ${names[1]} are typing...`
  else if (names.length > 2) label = 'Several people are typing...'

  return label
}
