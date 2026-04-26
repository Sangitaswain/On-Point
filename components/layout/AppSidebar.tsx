'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '@/convex/_generated/api'
import { UserMenu } from '@/components/layout/UserMenu'
import { NotificationBell } from '@/components/notifications/NotificationBell'

// Workspace emoji assigned deterministically by name hash
const WS_EMOJIS = ['⚙️', '🎨', '📣', '🚀', '🔧', '📄', '✨', '🧩']
const BOARD_EMOJIS = ['🚀', '🔧', '📄', '✨', '🧩', '📢', '⚡', '🎯']

function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}

function getWsEmoji(name: string) { return WS_EMOJIS[strHash(name) % WS_EMOJIS.length] }
function getBoardEmoji(title: string) { return BOARD_EMOJIS[strHash(title) % BOARD_EMOJIS.length] }

export function AppSidebar() {
  const pathname = usePathname()
  const workspaces = useQuery(api.workspaces.listMyWorkspaces)
  const { user } = useUser()

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      background: '#13161D',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo + notification bell */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {/* ◎ accent square */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'oklch(62% 0.22 263)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: '#fff',
        }}>◎</div>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#E4E7F0', flex: 1 }}>
          OnPoint
        </span>
        <NotificationBell />
      </div>

      {/* Workspaces + Boards */}
      <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Workspaces section */}
        <div style={{ padding: '12px 14px 6px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5F74', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Workspaces
          </div>

          {workspaces?.map((workspace) => {
            if (!workspace) return null
            const href = `/${workspace.slug}`
            const isActive = pathname === href || pathname.startsWith(`${href}/`)
            const emoji = getWsEmoji(workspace.name)

            return (
              <Link key={workspace._id} href={href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 2,
                    background: isActive ? 'oklch(62% 0.22 263 / 0.15)' : 'transparent',
                    border: isActive ? '1px solid oklch(62% 0.22 263 / 0.25)' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#1A1E2A' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 16 }}>{emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'oklch(62% 0.22 263)' : '#9499AE' }}>
                    {workspace.name}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Boards for current workspace */}
        <ActiveWorkspaceBoards pathname={pathname} workspaces={workspaces} />
      </nav>

      {/* User area */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <UserMenu />
      </div>
    </aside>
  )
}

function ActiveWorkspaceBoards({
  pathname,
  workspaces,
}: {
  pathname: string
  workspaces: ReturnType<typeof useQuery<typeof api.workspaces.listMyWorkspaces>>
}) {
  const activeWs = workspaces?.find(ws => ws && (pathname === `/${ws.slug}` || pathname.startsWith(`/${ws.slug}/`)))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boards = useQuery(api.boards.listByWorkspace, activeWs ? { workspaceId: activeWs._id as any } : 'skip')

  if (!activeWs || !boards || boards.length === 0) return null

  return (
    <div style={{ padding: '10px 14px 6px', flex: 1, overflowY: 'auto' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5F74', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
        Boards
      </div>
      {boards.map((board) => {
        const href = `/${activeWs.slug}/board/${board._id}`
        const isActive = pathname.startsWith(href)
        const emoji = getBoardEmoji(board.title)
        return (
          <Link key={board._id} href={href} style={{ textDecoration: 'none' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 2,
                background: isActive ? '#222638' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#1A1E2A' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: 14 }}>{emoji}</span>
              <span style={{ fontSize: 13, color: isActive ? '#E4E7F0' : '#9499AE', fontWeight: isActive ? 500 : 400 }}>
                {board.title}
              </span>
            </div>
          </Link>
        )
      })}

      {/* New board link */}
      <Link href={`/${activeWs.slug}`} style={{ textDecoration: 'none' }}>
        <div
          style={{ padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 7, transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1A1E2A'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <span style={{ fontSize: 16, color: '#5A5F74', fontWeight: 300 }}>+</span>
          <span style={{ fontSize: 13, color: '#5A5F74' }}>New board</span>
        </div>
      </Link>
    </div>
  )
}
