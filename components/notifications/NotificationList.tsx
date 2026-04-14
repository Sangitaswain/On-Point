'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { usePathname } from 'next/navigation'
import { NotificationItem } from './NotificationItem'
import { Button } from '@/components/ui/button'

export function NotificationList() {
  const notifications = useQuery(api.notifications.list)
  const markAllAsRead = useMutation(api.notifications.markAllAsRead)

  // Extract workspace slug from pathname: /[workspaceSlug]/...
  const pathname = usePathname()
  const workspaceSlug = pathname.split('/')[1] ?? ''

  const hasUnread = notifications?.some((n) => !n.isRead) ?? false

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Notifications</h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={() => markAllAsRead({})}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications === undefined ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </p>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n._id} notification={n} workspaceSlug={workspaceSlug} />
          ))
        )}
      </div>
    </div>
  )
}
