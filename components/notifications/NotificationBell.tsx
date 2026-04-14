'use client'

import { Bell } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NotificationList } from './NotificationList'

export function NotificationBell() {
  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <NotificationList />
      </PopoverContent>
    </Popover>
  )
}
