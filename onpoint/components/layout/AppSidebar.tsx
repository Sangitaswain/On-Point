'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/layout/UserMenu'
import { LayoutDashboard } from 'lucide-react'

// Deterministic color for a workspace based on its name
const WORKSPACE_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
]

function getWorkspaceColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return WORKSPACE_COLORS[Math.abs(hash) % WORKSPACE_COLORS.length]
}

export function AppSidebar() {
  const pathname = usePathname()
  const workspaces = useQuery(api.workspaces.listMyWorkspaces)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-4">
        <LayoutDashboard className="size-5 text-primary" />
        <span className="text-lg font-bold text-foreground">OnPoint</span>
      </div>

      {/* Workspace list */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Workspaces
        </p>
        <ul className="space-y-0.5">
          {workspaces?.map((workspace) => {
            if (!workspace) return null
            const href = `/${workspace.slug}`
            const isActive = pathname === href || pathname.startsWith(`${href}/`)

            return (
              <li key={workspace._id}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white',
                      getWorkspaceColor(workspace.name)
                    )}
                  >
                    {workspace.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{workspace.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User menu */}
      <div className="border-t border-border px-2 py-2">
        <UserMenu />
      </div>
    </aside>
  )
}
