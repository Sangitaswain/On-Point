'use client'

import { Doc } from '@/convex/_generated/dataModel'

type HydratedMessage = Doc<'chatMessages'> & {
  senderName: string
  senderAvatarUrl?: string
}

function timeLabel(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ChatMessage({ message }: { message: HydratedMessage }) {
  const initials = message.senderName.charAt(0).toUpperCase()

  return (
    <div className="flex items-start gap-2.5 px-3 py-1.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {message.senderAvatarUrl ? (
          <img src={message.senderAvatarUrl} alt={initials} className="size-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-foreground">{message.senderName}</span>
          <span className="text-[10px] text-muted-foreground">{timeLabel(message._creationTime)}</span>
        </div>
        <p className="break-words text-sm text-foreground">{message.body}</p>
      </div>
    </div>
  )
}
