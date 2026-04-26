'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

import { LoadingSpinner } from '@/components/loading-spinner'
import { BoardHeader } from '@/components/board/BoardHeader'
import { BoardView } from '@/components/board/BoardView'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ActivityLogPanel } from '@/components/board/ActivityLogPanel'

export default function BoardPage() {
  const params = useParams<{ workspaceSlug: string; boardId: string }>()
  const workspaceSlug = params.workspaceSlug
  const boardId = params.boardId as Id<'boards'>

  // Prefilter: only query if boardId looks valid (avoids FORBIDDEN on stale URLs)
  const board = useQuery(
    api.boards.get,
    boardId ? { boardId } : 'skip'
  )
  const [chatOpen, setChatOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)

  // Loading
  if (board === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm" style={{ color: '#9499AE' }}>Loading board...</p>
        </div>
      </div>
    )
  }

  // Not found or no access
  if (board === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-semibold" style={{ color: '#E4E7F0' }}>Board not found</p>
          <p className="text-sm" style={{ color: '#9499AE' }}>
            This board does not exist or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <BoardHeader
        board={board}
        workspaceSlug={workspaceSlug}
        workspaceName={workspaceSlug.replace(/-/g, ' ')}
        chatOpen={chatOpen}
        onChatToggle={() => setChatOpen((o) => !o)}
        activityOpen={activityOpen}
        onActivityToggle={() => setActivityOpen((o) => !o)}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <BoardView boardId={board._id} />
        </div>
        <ActivityLogPanel
          boardId={board._id}
          open={activityOpen}
          onClose={() => setActivityOpen(false)}
        />
        <ChatPanel
          boardId={board._id}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>
    </div>
  )
}
