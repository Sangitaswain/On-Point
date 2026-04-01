'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'

interface BoardHeaderProps {
  board: {
    _id: Id<'boards'>
    title: string
  }
  workspaceSlug: string
}

export function BoardHeader({ board, workspaceSlug }: BoardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
      <h1 className="text-xl font-bold text-foreground truncate">
        {board.title}
      </h1>
      <Link href={`/${workspaceSlug}/board/${board._id}/settings`}>
        <Button variant="ghost" size="icon-sm" aria-label="Board settings">
          <Settings className="size-4" />
        </Button>
      </Link>
    </header>
  )
}
