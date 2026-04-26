'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { PresenceBar } from '@/components/board/PresenceBar'

interface BoardHeaderProps {
  board: { _id: Id<'boards'>; title: string }
  workspaceSlug: string
  workspaceName?: string
  chatOpen: boolean
  onChatToggle: () => void
  activityOpen: boolean
  onActivityToggle: () => void
}

export function BoardHeader({
  board, workspaceSlug, workspaceName,
  chatOpen, onChatToggle, activityOpen, onActivityToggle,
}: BoardHeaderProps) {
  return (
    // Design: height 56px, surface bg, border-bottom, flex row with gap 12
    <header style={{
      height: 56,
      padding: '0 20px',
      background: '#13161D',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexShrink: 0,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {workspaceName && (
          <>
            <span style={{ fontSize: 14, color: '#5A5F74' }}>{workspaceName}</span>
            <span style={{ color: '#5A5F74', fontSize: 12 }}>›</span>
          </>
        )}
        <span style={{ fontSize: 14, fontWeight: 600, color: '#E4E7F0' }}>
          {board.title}
        </span>
      </div>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <PresenceBar boardId={board._id} />

        {/* Filter button */}
        <button
          style={{
            padding: '6px 12px',
            background: '#222638',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 7,
            color: '#9499AE',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ⚙ Filter
        </button>

        {/* Activity button */}
        <button
          onClick={onActivityToggle}
          style={{
            padding: '6px 12px',
            background: activityOpen ? 'oklch(62% 0.22 263 / 0.15)' : '#222638',
            border: activityOpen ? '1px solid oklch(62% 0.22 263)' : '1px solid rgba(255,255,255,0.07)',
            borderRadius: 7,
            color: activityOpen ? 'oklch(62% 0.22 263)' : '#9499AE',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
        >
          ⚡ Activity
        </button>

        {/* Chat / Invite */}
        <button
          onClick={onChatToggle}
          style={{
            padding: '6px 14px',
            background: chatOpen ? 'oklch(62% 0.22 263 / 0.15)' : 'oklch(62% 0.22 263)',
            border: chatOpen ? '1px solid oklch(62% 0.22 263)' : 'none',
            borderRadius: 7,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {chatOpen ? '✕ Chat' : '💬 Chat'}
        </button>

        {/* Settings */}
        <Link href={`/${workspaceSlug}/board/${board._id}/settings`}>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#5A5F74',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Board settings"
          >
            <Settings size={16} />
          </button>
        </Link>
      </div>
    </header>
  )
}
