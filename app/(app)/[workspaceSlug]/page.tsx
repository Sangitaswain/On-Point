'use client'

import { useParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

import { LoadingSpinner } from '@/components/loading-spinner'
import { WorkspaceDashboard } from '@/components/workspace/WorkspaceDashboard'

export default function WorkspacePage() {
  const params = useParams<{ workspaceSlug: string }>()
  const slug = params.workspaceSlug

  const workspace = useQuery(api.workspaces.getBySlug, { slug })

  // Loading
  if (workspace === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  // Not found or no access
  if (workspace === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-medium text-foreground">
            Workspace not found
          </p>
          <p className="text-sm text-muted-foreground">
            This workspace does not exist or you do not have access to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <WorkspaceDashboard
      workspace={{
        _id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        role: workspace.role,
      }}
    />
  )
}
