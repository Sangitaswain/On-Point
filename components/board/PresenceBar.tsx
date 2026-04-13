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
            <Avatar className="size-8 border-2 border-background transition-opacity duration-300 opacity-100 cursor-default">
              <AvatarFallback className="text-xs">{initials(user.userName)}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{user.userName}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <div className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  )
}
