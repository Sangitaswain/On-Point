'use client'

import { Id } from '@/convex/_generated/dataModel'
import { usePresence } from '@/hooks/usePresence'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const MAX_VISIBLE = 5

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface PresenceBarProps {
  boardId: Id<'boards'>
}

export function PresenceBar({ boardId }: PresenceBarProps) {
  const users = usePresence(boardId)
  if (users.length === 0) return null

  const visible = users.slice(0, MAX_VISIBLE)
  const overflow = users.length - MAX_VISIBLE

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Tooltip key={user.userId}>
          <TooltipTrigger>
            <div className="relative">
              <Avatar className="size-7 border-2 border-card cursor-default transition-transform hover:-translate-y-0.5">
                <AvatarFallback className="text-[10px] font-semibold bg-primary/20 text-primary">
                  {initials(user.userName)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-green-500 border border-card" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{user.userName}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <div className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  )
}
