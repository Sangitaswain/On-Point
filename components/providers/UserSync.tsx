'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useConvexAuth } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '@/convex/_generated/api'

/**
 * Silently syncs the Clerk user into Convex on sign-in.
 * This is a fallback for when the Clerk webhook hasn't fired
 * (e.g. local dev where localhost isn't publicly accessible).
 * Passes the full user profile from the Clerk SDK so the name
 * is never 'User' even when the JWT template lacks a name claim.
 * Idempotent — safe to call on every page load.
 */
export function UserSync() {
  const { isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const syncUser = useMutation(api.users.syncUser)
  const didSync = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !user || didSync.current) return
    didSync.current = true

    const joined = [user.firstName, user.lastName].filter(Boolean).join(' ')
    const name = user.fullName ?? (joined || user.username) ?? undefined

    syncUser({
      name: name ?? undefined,
      avatarUrl: user.imageUrl ?? undefined,
    }).catch(() => {
      didSync.current = false
    })
  }, [isAuthenticated, user, syncUser])

  return null
}
