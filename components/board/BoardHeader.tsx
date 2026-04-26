'use client'

import Link from 'next/link'
import { MessageSquare, Settings, Activity, Zap } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { PresenceBar } from '@/components/board/PresenceBar'
import { cn } from '@/lib/utils'

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

export function BoardHeader({
  board,
  workspaceSlug,
  chatOpen,
  onChatToggle,
  activityOpen,
  onActivityToggle,
}: BoardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-5 py-2.5 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base font-bold text-foreground truncate">{board.title}</h1>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <PresenceBar boardId={board._id} />

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle activity log"
          onClick={onActivityToggle}
          className={cn(
            'transition-colors',
            activityOpen && 'bg-primary/15 text-primary hover:bg-primary/20'
          )}
        >
          <Activity className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle chat"
          onClick={onChatToggle}
          className={cn(
            'transition-colors',
            chatOpen && 'bg-primary/15 text-primary hover:bg-primary/20'
          )}
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
