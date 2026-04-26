'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/layout/UserMenu'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { Settings, LayoutGrid, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const WORKSPACE_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#0891b2', '#EF4444', '#14B8A6',
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
  const [expandedWs, setExpandedWs] = useState<string | null>(null)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20">
            <LayoutGrid className="size-4 text-primary" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            On<span className="text-primary">Point</span>
          </span>
        </div>
        <NotificationBell />
      </div>

      {/* Workspace list */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Workspaces
        </p>

        {workspaces?.map((workspace) => {
          if (!workspace) return null
          const href = `/${workspace.slug}`
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          const color = getWorkspaceColor(workspace.name)
          const isExpanded = expandedWs === workspace._id || isActive

          return (
            <div key={workspace._id}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpandedWs(isExpanded ? null : workspace._id)}
                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Expand workspace"
                >
                  <ChevronRight
                    className={cn('size-3 transition-transform', isExpanded && 'rotate-90')}
                  />
                </button>

                <Link
                  href={href}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all',
                    isActive
                      ? 'bg-primary/10 font-semibold text-foreground'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  )}
                >
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                    style={{ background: color }}
                  >
                    {workspace.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{workspace.name}</span>
                </Link>

                <Link
                  href={`${href}/settings`}
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded p-1 transition-colors',
                    pathname.startsWith(`${href}/settings`)
                      ? 'text-foreground'
                      : 'text-muted-foreground/40 hover:text-muted-foreground'
                  )}
                  aria-label={`${workspace.name} settings`}
                >
                  <Settings className="size-3" />
                </Link>
              </div>

              {/* Board sub-items (shown when expanded/active) */}
              {isExpanded && (
                <BoardSubList workspaceId={workspace._id} workspaceSlug={workspace.slug} pathname={pathname} color={color} />
              )}
            </div>
          )
        })}
      </nav>

      {/* User menu */}
      <div className="border-t border-border px-2 py-2">
        <UserMenu />
      </div>
    </aside>
  )
}

function BoardSubList({
  workspaceId,
  workspaceSlug,
  pathname,
  color,
}: {
  workspaceId: string
  workspaceSlug: string
  pathname: string
  color: string
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boards = useQuery(api.boards.listByWorkspace, { workspaceId: workspaceId as any })

  if (!boards || boards.length === 0) return null

  return (
    <ul className="ml-6 mt-0.5 space-y-0.5 border-l border-border pl-2">
      {boards.slice(0, 6).map((board) => {
        const href = `/${workspaceSlug}/board/${board._id}`
        const isActive = pathname.startsWith(href)
        return (
          <li key={board._id}>
            <Link
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-all',
                isActive
                  ? 'bg-primary/10 font-semibold text-foreground'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ background: isActive ? color : 'currentColor', opacity: isActive ? 1 : 0.4 }}
              />
              <span className="truncate">{board.title}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
