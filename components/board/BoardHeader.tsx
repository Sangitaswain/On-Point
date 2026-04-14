'use client'

import Link from 'next/link'
import { MessageSquare, Settings, Activity } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { PresenceBar } from '@/components/board/PresenceBar'

interface BoardHeaderProps {
  board: {
    _id: Id<'boards'>
    title: string
  }
  workspaceSlug: string
  chatOpen: boolean
  onChatToggle: () => void
  activityOpen: boolean
  onActivityToggle: () => void
}

export function BoardHeader({ board, workspaceSlug, chatOpen, onChatToggle, activityOpen, onActivityToggle }: BoardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
      <h1 className="text-xl font-bold text-foreground truncate">
        {board.title}
      </h1>
      <div className="flex items-center gap-3">
        <PresenceBar boardId={board._id} />
        <Button
          variant={activityOpen ? 'outline' : 'ghost'}
          size="icon-sm"
          aria-label="Toggle activity log"
          onClick={onActivityToggle}
        >
          <Activity className="size-4" />
        </Button>
        <Button
          variant={chatOpen ? 'outline' : 'ghost'}
          size="icon-sm"
          aria-label="Toggle chat"
          onClick={onChatToggle}
        >
          <MessageSquare className="size-4" />
        </Button>
        <Link href={`/${workspaceSlug}/board/${board._id}/settings`}>
          <Button variant="ghost" size="icon-sm" aria-label="Board settings">
            <Settings className="size-4" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
