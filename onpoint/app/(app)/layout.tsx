'use client'

import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'

import { LoadingSpinner } from '@/components/loading-spinner'
import { AppSidebar } from '@/components/layout/AppSidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const workspaces = useQuery(api.workspaces.listMyWorkspaces)

  useEffect(() => {
    if (workspaces && workspaces.length === 0) {
      router.replace('/onboarding')
    }
  }, [workspaces, router])

  // Query is still loading (undefined means Convex hasn't returned yet,
  // which also covers the case where the user record doesn't exist yet
  // and requireUser throws USER_NOT_FOUND)
  if (workspaces === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  // No workspaces -- redirecting to onboarding (useEffect above)
  if (workspaces.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
