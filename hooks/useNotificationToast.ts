'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'

export function useNotificationToast() {
  const notifications = useQuery(api.notifications.list) ?? []
  const prevIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (notifications.length === 0) {
      prevIdsRef.current = new Set()
      return
    }

    // First load — just record IDs, don't toast
    if (prevIdsRef.current === null) {
      prevIdsRef.current = new Set(notifications.map((n) => n._id))
      return
    }

    const prevIds = prevIdsRef.current

    for (const n of notifications) {
      if (prevIds.has(n._id)) continue

      const message =
        n.type === 'ASSIGNED'
          ? `${n.actorName} assigned you to "${n.cardTitle}"`
          : `${n.actorName} mentioned you in "${n.cardTitle}"`

      toast(message, {
        action: {
          label: 'View',
          onClick: () => {
            const workspaceSlug = getWorkspaceSlug()
            window.location.href = `/${workspaceSlug}/board/${n.boardId}?card=${n.cardId}`
          },
        },
      })
    }

    prevIdsRef.current = new Set(notifications.map((n) => n._id))
  }, [notifications])
}

function getWorkspaceSlug(): string {
  if (typeof window === 'undefined') return ''
  return window.location.pathname.split('/')[1] ?? ''
}
