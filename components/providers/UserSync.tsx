'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'

/**
 * Silently syncs the Clerk user into Convex on sign-in.
 * This is a fallback for when the Clerk webhook hasn't fired
 * (e.g. local dev where localhost isn't publicly accessible).
 * Idempotent — safe to call on every page load.
 */
export function UserSync() {
  const { isAuthenticated } = useConvexAuth()
  const syncUser = useMutation(api.users.syncUser)
  const didSync = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || didSync.current) return
    didSync.current = true
    syncUser().catch(() => {
      // Non-fatal — webhook may have already created the user
      didSync.current = false
    })
  }, [isAuthenticated, syncUser])

  return null
}
