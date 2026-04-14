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

export default function BoardPage() {
  const params = useParams<{ workspaceSlug: string; boardId: string }>()
  const workspaceSlug = params.workspaceSlug
  const boardId = params.boardId as Id<'boards'>

  const board = useQuery(api.boards.get, { boardId })
  const [chatOpen, setChatOpen] = useState(false)

  // Loading
  if (board === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Loading board...</p>
        </div>
      </div>
    )
  }

  // Error / not found — Convex throws on missing board, so null means error
  if (board === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-medium text-foreground">Board not found</p>
          <p className="text-sm text-muted-foreground">
            This board does not exist or you do not have access to it.
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
        chatOpen={chatOpen}
        onChatToggle={() => setChatOpen((o) => !o)}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <BoardView boardId={board._id} />
        </div>
        <ChatPanel
          boardId={board._id}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>
    </div>
  )
}
