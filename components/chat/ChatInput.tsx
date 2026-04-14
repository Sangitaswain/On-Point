'use client'

import { useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useSocket } from '@/components/providers/SocketProvider'
import { Id } from '@/convex/_generated/dataModel'
import { Send } from 'lucide-react'

interface Props {
  boardId: Id<'boards'>
}

export function ChatInput({ boardId }: Props) {
  const [value, setValue] = useState('')
  const sendMessage = useMutation(api.chat.sendChatMessage)
  const socket = useSocket()
  const typingRef = useRef(false)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startTyping() {
    if (!typingRef.current) {
      typingRef.current = true
      socket?.emit('TYPING_START', { boardId })
    }
    // Reset the stop timer
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = setTimeout(() => stopTyping(), 2000)
  }

  function stopTyping() {
    if (typingRef.current) {
      typingRef.current = false
      socket?.emit('TYPING_STOP', { boardId })
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = value.trim()
    if (!body) return

    stopTyping()
    setValue('')

    await sendMessage({ boardId, body })
    socket?.emit('CHAT_MESSAGE_SENT', { boardId })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t px-3 py-2">
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          startTyping()
        }}
        placeholder="Message..."
        className="flex-1 rounded-md bg-muted px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
        aria-label="Send"
      >
        <Send className="size-3.5" />
      </button>
    </form>
  )
}
