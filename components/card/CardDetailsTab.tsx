'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Code, List, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSocket } from '@/components/providers/SocketProvider'

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

// Check if Tiptap JSON content is empty
function isDescriptionEmpty(content: unknown): boolean {
  if (!content) return true
  const c = content as { content?: { content?: unknown[] }[] }
  if (!c.content || c.content.length === 0) return true
  if (c.content.length === 1 && (!c.content[0].content || c.content[0].content.length === 0)) return true
  return false
}

export function CardDetailsTab({ card }: CardDetailsTabProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(card.title)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const updateCard = useMutation(api.cards.updateCard)
  const socket = useSocket()

  // Sync external title changes
  useEffect(() => {
    if (!isEditingTitle) setTitleValue(card.title)
  }, [card.title, isEditingTitle])

  // ── Title handlers ─────────────────────────────────────────

  const handleTitleSave = useCallback(async () => {
    const trimmed = titleValue.trim()
    if (!trimmed || trimmed === card.title) {
      setTitleValue(card.title)
      setIsEditingTitle(false)
      return
    }
    try {
      await updateCard({ cardId: card._id, title: trimmed })
      socket?.emit('CARD_UPDATED', { boardId: card.boardId, cardId: card._id, changes: { title: trimmed } })
    } catch {
      setTitleValue(card.title)
    }
    setIsEditingTitle(false)
  }, [titleValue, card.title, card._id, card.boardId, updateCard, socket])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleTitleSave() }
      if (e.key === 'Escape') { setTitleValue(card.title); setIsEditingTitle(false) }
    },
    [handleTitleSave, card.title]
  )

  // ── Description editor ─────────────────────────────────────

  // View-mode editor (read-only, renders saved content)
  const viewEditor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [StarterKit],
    content: (card.description as object) ?? undefined,
    editorProps: {
      attributes: { class: 'prose prose-sm dark:prose-invert max-w-none outline-none' },
    },
  })

  // Edit-mode editor
  const editEditor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Add a description…' }),
    ],
    content: (card.description as object) ?? undefined,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[100px] outline-none',
      },
    },
  })

  // When entering edit mode, copy saved content into edit editor
  const handleStartEdit = useCallback(() => {
    if (editEditor && card.description) {
      editEditor.commands.setContent(card.description as object)
    }
    setIsEditingDesc(true)
    setTimeout(() => editEditor?.commands.focus(), 0)
  }, [editEditor, card.description])

  const handleSaveDesc = useCallback(async () => {
    if (!editEditor) return
    setIsSaving(true)
    try {
      const json = editEditor.getJSON()
      await updateCard({ cardId: card._id, description: json })
      socket?.emit('CARD_UPDATED', { boardId: card.boardId, cardId: card._id, changes: { description: json } })
      // Sync view editor with saved content
      viewEditor?.commands.setContent(json)
      setIsEditingDesc(false)
    } catch {
      // Could show toast
    } finally {
      setIsSaving(false)
    }
  }, [editEditor, viewEditor, card._id, card.boardId, updateCard, socket])

  const handleCancelDesc = useCallback(() => {
    // Restore edit editor to saved content
    if (editEditor && card.description) {
      editEditor.commands.setContent(card.description as object)
    } else if (editEditor) {
      editEditor.commands.clearContent()
    }
    setIsEditingDesc(false)
  }, [editEditor, card.description])

  const descEmpty = isDescriptionEmpty(card.description)

  return (
    <div className="flex flex-col gap-5">
      {/* ── Title ─────────────────────────────────────────── */}
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
            className="w-full bg-transparent text-xl font-bold text-foreground outline-none border-b-2 border-primary pb-0.5"
          />
        ) : (
          <h2
            role="button"
            tabIndex={0}
            onClick={() => setIsEditingTitle(true)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(true)}
            className="cursor-text text-xl font-bold text-foreground hover:text-foreground/80 transition-colors rounded px-0.5 -mx-0.5"
          >
            {card.title}
          </h2>
        )}
      </div>

      {/* ── Description ───────────────────────────────────── */}
      <div className="group/desc flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Description
          </p>
          {!isEditingDesc && !descEmpty && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover/desc:opacity-100"
            >
              <Pencil className="size-3" />
              Edit
            </button>
          )}
        </div>

        {/* View mode */}
        {!isEditingDesc && (
          descEmpty ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="rounded-md border border-dashed border-border px-3 py-3 text-left text-sm text-muted-foreground hover:border-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
            >
              Add a description…
            </button>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={handleStartEdit}
              onKeyDown={(e) => e.key === 'Enter' && handleStartEdit()}
              className="group rounded-md px-3 py-2 cursor-text hover:bg-muted/40 transition-colors ring-1 ring-transparent hover:ring-border"
            >
              <EditorContent editor={viewEditor} />
            </div>
          )
        )}

        {/* Edit mode */}
        {isEditingDesc && (
          <div className="rounded-md border border-input bg-background ring-1 ring-ring/30 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
              {[
                { icon: <Bold className="size-3.5" />, cmd: () => editEditor?.chain().focus().toggleBold().run(), active: editEditor?.isActive('bold'), label: 'Bold' },
                { icon: <Italic className="size-3.5" />, cmd: () => editEditor?.chain().focus().toggleItalic().run(), active: editEditor?.isActive('italic'), label: 'Italic' },
                { icon: <Code className="size-3.5" />, cmd: () => editEditor?.chain().focus().toggleCode().run(), active: editEditor?.isActive('code'), label: 'Code' },
                { icon: <List className="size-3.5" />, cmd: () => editEditor?.chain().focus().toggleBulletList().run(), active: editEditor?.isActive('bulletList'), label: 'List' },
              ].map(({ icon, cmd, active, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  onMouseDown={(e) => { e.preventDefault(); cmd() }}
                  className={`rounded p-1 transition-colors ${active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Editor */}
            <div className="px-3 py-2">
              <EditorContent editor={editEditor} />
            </div>

            {/* Save / Cancel */}
            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-3 py-2">
              <button
                type="button"
                onClick={handleCancelDesc}
                disabled={isSaving}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                <X className="size-3" />
                Cancel
              </button>
              <Button
                size="sm"
                onClick={handleSaveDesc}
                disabled={isSaving}
                className="h-7 text-xs"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
