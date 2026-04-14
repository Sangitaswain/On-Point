'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { MessageSquare, X } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'

interface Props {
  boardId: Id<'boards'>
  open: boolean
  onClose: () => void
}

export function ChatPanel({ boardId, open, onClose }: Props) {
  const messages = useQuery(api.chat.listByBoard, open ? { boardId } : 'skip')
  const typingLabel = useTypingIndicator(boardId)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length])

  if (!open) return null

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="size-4" />
          Chat
        </div>
        <button onClick={onClose} className="rounded p-0.5 hover:bg-muted" aria-label="Close chat">
          <X className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-1">
        {messages === undefined ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((m) => <ChatMessage key={m._id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingLabel && (
        <p className="px-3 pb-1 text-[11px] italic text-muted-foreground">{typingLabel}</p>
      )}

      {/* Input */}
      <ChatInput boardId={boardId} />
    </div>
  )
}
