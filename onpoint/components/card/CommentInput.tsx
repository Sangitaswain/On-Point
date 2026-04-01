'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Send } from 'lucide-react'

import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface CommentInputProps {
  cardId: Id<'cards'>
}

export function CommentInput({ cardId }: CommentInputProps) {
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createComment = useMutation(api.comments.createComment)

  const handleSubmit = useCallback(async () => {
    const trimmed = body.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      await createComment({ cardId, body: trimmed })
      setBody('')
    } catch {
      // Could show toast
    } finally {
      setIsSubmitting(false)
    }
  }, [body, cardId, createComment])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl + Enter to submit
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment... (Ctrl+Enter to submit)"
        className="min-h-[60px]"
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !body.trim()}
        >
          <Send className="size-3.5" />
          {isSubmitting ? 'Sending...' : 'Comment'}
        </Button>
      </div>
    </div>
  )
}
