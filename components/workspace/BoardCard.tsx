'use client'

import Link from 'next/link'
import { Globe, Lock, LayoutGrid } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

interface BoardCardProps {
  board: {
    _id: Id<'boards'>
    title: string
    visibility: 'private' | 'workspace'
  }
  workspaceSlug: string
}

const BOARD_COLORS = [
  'from-indigo-500/20 to-violet-500/10 border-indigo-500/20',
  'from-emerald-500/20 to-teal-500/10 border-emerald-500/20',
  'from-amber-500/20 to-orange-500/10 border-amber-500/20',
  'from-pink-500/20 to-rose-500/10 border-pink-500/20',
  'from-cyan-500/20 to-sky-500/10 border-cyan-500/20',
  'from-violet-500/20 to-purple-500/10 border-violet-500/20',
]

const ICON_COLORS = [
  'text-indigo-400', 'text-emerald-400', 'text-amber-400',
  'text-pink-400', 'text-cyan-400', 'text-violet-400',
]

function getBoardColorIndex(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % BOARD_COLORS.length
}

export function BoardCard({ board, workspaceSlug }: BoardCardProps) {
  const idx = getBoardColorIndex(board._id)
  return (
    <Link href={`/${workspaceSlug}/board/${board._id}`}>
      <div className={`group relative rounded-xl border bg-gradient-to-br ${BOARD_COLORS[idx]} p-4 transition-all hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 cursor-pointer`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`flex size-9 items-center justify-center rounded-lg bg-card/80 ${ICON_COLORS[idx]}`}>
            <LayoutGrid className="size-4" />
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border ${
            board.visibility === 'workspace'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-muted/50 border-border text-muted-foreground'
          }`}>
            {board.visibility === 'workspace'
              ? <><Globe className="size-2.5" /> Workspace</>
              : <><Lock className="size-2.5" /> Private</>}
          </span>
        </div>
        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
          {board.title}
        </h3>
      </div>
    </Link>
  )
}
