'use client'

import Link from 'next/link'
import { Globe, Lock } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { Badge } from '@/components/ui/badge'

interface BoardCardProps {
  board: {
    _id: Id<'boards'>
    title: string
    visibility: 'private' | 'workspace'
  }
  workspaceSlug: string
}

export function BoardCard({ board, workspaceSlug }: BoardCardProps) {
  return (
    <Link href={`/${workspaceSlug}/board/${board._id}`}>
      <div className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {board.title}
          </h3>
          <Badge
            variant={board.visibility === 'workspace' ? 'secondary' : 'outline'}
            className="shrink-0"
          >
            {board.visibility === 'workspace' ? (
              <>
                <Globe className="size-3" />
                Workspace
              </>
            ) : (
              <>
                <Lock className="size-3" />
                Private
              </>
            )}
          </Badge>
        </div>
      </div>
    </Link>
  )
}
