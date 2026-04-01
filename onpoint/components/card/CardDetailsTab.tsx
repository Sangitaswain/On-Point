'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Code, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { AssigneePicker } from './AssigneePicker'
import { LabelPicker } from './LabelPicker'
import { DueDatePicker } from './DueDatePicker'

interface CardLabel {
  _id: string
  cardId: string
  label: string
  color: string
}

interface CardData {
  _id: Id<'cards'>
  boardId: Id<'boards'>
  columnId: Id<'columns'>
  title: string
  description?: unknown
  assigneeId?: Id<'users'>
  dueDate?: string
  orderIndex: number
  labels: CardLabel[]
}

interface CardDetailsTabProps {
  card: CardData
}

export function CardDetailsTab({ card }: CardDetailsTabProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(card.title)
  const [isSavingDescription, setIsSavingDescription] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const updateCard = useMutation(api.cards.updateCard)

  // Sync title when card changes externally
  useEffect(() => {
    if (!isEditingTitle) {
      setTitleValue(card.title)
    }
  }, [card.title, isEditingTitle])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Add a description...',
      }),
    ],
    content: card.description ?? undefined,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[80px] px-3 py-2 rounded-lg border border-input bg-transparent focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/50',
      },
    },
  })

  const handleTitleSave = useCallback(async () => {
    const trimmed = titleValue.trim()
    if (!trimmed || trimmed === card.title) {
      setTitleValue(card.title)
      setIsEditingTitle(false)
      return
    }
    try {
      await updateCard({ cardId: card._id, title: trimmed })
    } catch {
      setTitleValue(card.title)
    }
    setIsEditingTitle(false)
  }, [titleValue, card.title, card._id, updateCard])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleTitleSave()
      }
      if (e.key === 'Escape') {
        setTitleValue(card.title)
        setIsEditingTitle(false)
      }
    },
    [handleTitleSave, card.title]
  )

  const handleSaveDescription = useCallback(async () => {
    if (!editor) return
    setIsSavingDescription(true)
    try {
      await updateCard({ cardId: card._id, description: editor.getJSON() })
    } catch {
      // Could show a toast here
    } finally {
      setIsSavingDescription(false)
    }
  }, [editor, card._id, updateCard])

  return (
    <div className="flex flex-col gap-6">
      {/* Inline editable title */}
      <div>
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            className="w-full border-b-2 border-primary bg-transparent text-lg font-semibold outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsEditingTitle(true)
              // Focus after render
              setTimeout(() => titleInputRef.current?.focus(), 0)
            }}
            className="w-full cursor-text text-left text-lg font-semibold hover:bg-muted/50 rounded px-1 -mx-1 py-0.5 transition-colors"
          >
            {card.title}
          </button>
        )}
      </div>

      {/* Description editor with Tiptap */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">
          Description
        </label>

        {/* Toolbar */}
        {editor && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
              size="icon-xs"
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Toggle bold"
            >
              <Bold className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
              size="icon-xs"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Toggle italic"
            >
              <Italic className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('code') ? 'secondary' : 'ghost'}
              size="icon-xs"
              onClick={() => editor.chain().focus().toggleCode().run()}
              aria-label="Toggle code"
            >
              <Code className="size-3.5" />
            </Button>
          </div>
        )}

        <EditorContent editor={editor} />

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSaveDescription}
            disabled={isSavingDescription}
          >
            <Save className="size-3.5" />
            {isSavingDescription ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Pickers grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Assignee
          </label>
          <AssigneePicker
            cardId={card._id}
            currentAssigneeId={card.assigneeId}
            boardId={card.boardId}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Labels
          </label>
          <LabelPicker cardId={card._id} currentLabels={card.labels} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Due Date
          </label>
          <DueDatePicker cardId={card._id} currentDueDate={card.dueDate} />
        </div>
      </div>
    </div>
  )
}
