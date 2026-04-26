'use client'

import { Id } from '@/convex/_generated/dataModel'
import { usePresence } from '@/hooks/usePresence'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const MAX_VISIBLE = 5

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

interface PresenceBarProps {
  boardId: Id<'boards'>
}

// Design: stacked avatars with green pulse dot + "N online" label
export function PresenceBar({ boardId }: PresenceBarProps) {
  const users = usePresence(boardId)
  if (users.length === 0) return null

  const visible = users.slice(0, MAX_VISIBLE)
  const overflow = users.length - MAX_VISIBLE

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', marginRight: 4 }}>
        {visible.map((user, i) => (
          <Tooltip key={user.userId}>
            <TooltipTrigger>
              <div style={{ marginLeft: i === 0 ? 0 : -6, position: 'relative', zIndex: visible.length - i, cursor: 'default' }}>
                {/* Avatar circle */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'oklch(62% 0.22 263 / 0.2)',
                  border: '1.5px solid oklch(62% 0.22 263 / 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600, color: 'oklch(62% 0.22 263)',
                  position: 'relative',
                }}>
                  {initials(user.userName)}
                  {/* Green pulse dot */}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'oklch(68% 0.18 155)',
                    border: '1.5px solid #0D0F14',
                    animation: 'pulseDot 2s ease infinite',
                  }} />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>{user.userName}</p></TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <div style={{
            marginLeft: -6,
            width: 28, height: 28, borderRadius: '50%',
            background: '#222638',
            border: '1.5px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600, color: '#9499AE',
          }}>
            +{overflow}
          </div>
        )}
      </div>
      <span style={{ fontSize: 12, color: '#5A5F74' }}>{users.length} online</span>
    </div>
  )
}
