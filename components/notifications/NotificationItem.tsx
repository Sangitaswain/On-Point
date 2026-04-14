'use client'

import { AtSign, UserCheck } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Doc } from '@/convex/_generated/dataModel'

type HydratedNotification = Doc<'notifications'> & {
  actorName: string
  cardTitle: string
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface Props {
  notification: HydratedNotification
  workspaceSlug: string
}

export function NotificationItem({ notification, workspaceSlug }: Props) {
  const markAsRead = useMutation(api.notifications.markAsRead)
  const router = useRouter()

  const message =
    notification.type === 'ASSIGNED'
      ? `${notification.actorName} assigned you to "${notification.cardTitle}"`
      : `${notification.actorName} mentioned you in "${notification.cardTitle}"`

  async function handleClick() {
    await markAsRead({ notificationId: notification._id })
    router.push(`/${workspaceSlug}/board/${notification.boardId}`)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
        !notification.isRead && 'bg-blue-50 dark:bg-blue-950/20'
      )}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {notification.type === 'ASSIGNED' ? (
          <UserCheck className="size-3.5" />
        ) : (
          <AtSign className="size-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {timeAgo(notification._creationTime)}
        </p>
      </div>
      {!notification.isRead && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />
      )}
    </button>
  )
}
