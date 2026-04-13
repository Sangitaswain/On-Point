'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Send } from 'lucide-react'
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import type { SuggestionProps } from '@tiptap/suggestion'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import { MentionList, type MentionListRef } from './MentionList'
import { Button } from '@/components/ui/button'

interface CommentInputProps {
  cardId: Id<'cards'>
  boardId: Id<'boards'>
}

export function CommentInput({ cardId, boardId }: CommentInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createComment = useMutation(api.comments.createComment)

  const board = useQuery(api.boards.get, { boardId })
  const members = useQuery(
    api.workspaces.listMembers,
    board?.workspaceId ? { workspaceId: board.workspaceId } : 'skip'
  )
  // Keep a ref so the suggestion closure always sees latest members
  const membersRef = useRef(members ?? [])
  useEffect(() => { membersRef.current = members ?? [] }, [members])

  // Ref to break the cycle between useEditor and handleSubmit
  const handleSubmitRef = useRef<() => void>(() => {})

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: { class: 'text-primary font-medium' },
        suggestion: {
          items: ({ query }: { query: string }) =>
            membersRef.current
              .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 6),
          render: () => {
            let component: ReactRenderer<MentionListRef>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let popup: any[]

            return {
              onStart: (props: SuggestionProps) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                }) as ReactRenderer<MentionListRef>
                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                })
              },
              onUpdate: (props: SuggestionProps) => {
                component.updateProps(props)
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                })
              },
              onKeyDown: (props: { event: KeyboardEvent }) => {
                if (props.event.key === 'Escape') {
                  popup[0].hide()
                  return true
                }
                return component.ref?.onKeyDown(props) ?? false
              },
              onExit: () => {
                popup[0].destroy()
                component.destroy()
              },
            }
          },
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'outline-none text-sm min-h-[60px] px-3 py-2',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          handleSubmitRef.current()
          return true
        }
        return false
      },
    },
  })

  const handleSubmit = useCallback(async () => {
    if (!editor) return
    const text = editor.getText().trim()
    if (!text) return

    setIsSubmitting(true)
    try {
      await createComment({ cardId, body: editor.getJSON() })
      editor.commands.clearContent()
    } catch {
      // Could show toast
    } finally {
      setIsSubmitting(false)
    }
  }, [editor, cardId, createComment])

  useEffect(() => { handleSubmitRef.current = handleSubmit }, [handleSubmit])

  const isEmpty = !editor?.getText().trim()

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring/30">
        <EditorContent editor={editor} />
        <p className="px-3 pb-2 text-[11px] text-muted-foreground">
          Type @ to mention · Ctrl+Enter to submit
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || isEmpty}
        >
          <Send className="size-3.5" />
          {isSubmitting ? 'Sending...' : 'Comment'}
        </Button>
      </div>
    </div>
  )
}
