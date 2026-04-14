'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { MessageSquare } from 'lucide-react'

import { CommentItem } from './CommentItem'
import { CommentInput } from './CommentInput'

interface CommentThreadProps {
  cardId: Id<'cards'>
  boardId: Id<'boards'>
  canComment?: boolean
}

export function CommentThread({ cardId, boardId, canComment = true }: CommentThreadProps) {
  const comments = useQuery(api.comments.listByCard, { cardId })
  const currentUser = useQuery(api.users.getMe)
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll to newest comment whenever the list grows
  useEffect(() => {
    if (listRef.current && comments && comments.length > 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments?.length])

  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <MessageSquare className="size-4" />
        Comments
        {comments && comments.length > 0 && (
          <span className="text-xs">({comments.length})</span>
        )}
      </h3>

      {!comments ? (
        <div className="flex items-center justify-center py-4">
          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No comments yet. Be the first to add one.
        </p>
      ) : (
        <div ref={listRef} className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              currentUserId={currentUser?._id}
            />
          ))}
        </div>
      )}

      {canComment && <CommentInput cardId={cardId} boardId={boardId} />}
    </div>
  )
}
