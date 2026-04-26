'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Trash2, ExternalLink } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface CardLabel {
  label: string
  color: string
}

interface CardItemProps {
  card: {
    _id: Id<'cards'>
    columnId: Id<'columns'>
    title: string
    assigneeId?: Id<'users'>
    assigneeName?: string
    assigneeAvatarUrl?: string
    dueDate?: string
    labels?: CardLabel[]
  }
  onClick: () => void
  canEdit?: boolean
}

// Full hex values for label colors
const LABEL_HEX: Record<string, string> = {
  red:    '#EF4444',
  blue:   '#6366F1',
  orange: '#F59E0B',
  purple: '#8B5CF6',
  gray:   '#5A5F74',
  green:  '#10B981',
}

function isDueDatePast(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function CardItem({ card, onClick, canEdit = true }: CardItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card._id,
    data: { type: 'card', columnId: card.columnId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const deleteCard = useMutation(api.cards.deleteCard)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try { await deleteCard({ cardId: card._id }) }
    finally { setIsDeleting(false); setDeleteOpen(false) }
  }, [card._id, deleteCard])

  const hasDueDate = !!card.dueDate
  const isPast = hasDueDate && isDueDatePast(card.dueDate!)
  const labels = card.labels ?? []

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        className="group relative w-full text-left cursor-pointer select-none"
      >
        <div
          className="rounded-[6px] border transition-all duration-150"
          style={{
            background: '#1A1E2A',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '12px 14px',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = 'rgba(255,255,255,0.12)'
            el.style.transform = 'translateY(-1px)'
            el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = 'rgba(255,255,255,0.07)'
            el.style.transform = 'none'
            el.style.boxShadow = 'none'
          }}
        >
          {/* Drag handle — appears on hover */}
          {canEdit && (
            <button
              type="button"
              {...listeners}
              {...attributes}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 left-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 touch-none"
              style={{ color: 'var(--text-dim, #5A5F74)' }}
              aria-label="Drag card"
            >
              <GripVertical className="size-3" />
            </button>
          )}

          {/* Tags as pill badges — matches design Tag component */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {labels.slice(0, 3).map((l, i) => {
                const hex = LABEL_HEX[l.color] ?? '#5A5F74'
                return (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: hex + '18',
                      border: `1px solid ${hex}33`,
                      color: hex,
                      fontSize: 11,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {l.label}
                  </span>
                )
              })}
            </div>
          )}

          {/* Title */}
          <p
            className="line-clamp-2"
            style={{ fontSize: 13, fontWeight: 500, color: '#E4E7F0', lineHeight: 1.5, marginBottom: 10 }}
          >
            {card.title}
          </p>

          {/* Footer: assignee avatars | due date | three-dot menu */}
          <div className="flex items-center justify-between">
            {/* Left: stacked assignee avatars */}
            <div className="flex items-center">
              {card.assigneeId && (
                <div style={{ position: 'relative' }}>
                  <Avatar
                    className="size-[22px] border"
                    style={{ borderColor: '#1A1E2A', borderWidth: 2 }}
                    title={card.assigneeName}
                  >
                    {card.assigneeAvatarUrl && (
                      <AvatarImage src={card.assigneeAvatarUrl} alt={card.assigneeName} />
                    )}
                    <AvatarFallback
                      className="text-[8px] font-semibold"
                      style={{ background: 'oklch(62% 0.22 263 / 0.2)', color: 'oklch(62% 0.22 263)' }}
                    >
                      {card.assigneeName && card.assigneeName !== '[Removed Member]'
                        ? getInitials(card.assigneeName)
                        : '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            {/* Right: due date + menu */}
            <div className="flex items-center gap-2 ml-auto">
              {hasDueDate && (
                <span
                  style={{
                    fontSize: 10,
                    color: isPast ? 'oklch(62% 0.2 18)' : '#5A5F74',
                  }}
                >
                  {formatDueDate(card.dueDate!)}
                </span>
              )}

              {/* Three-dot menu */}
              <div
                role="none"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                  <DropdownMenuTrigger
                    aria-label="Card options"
                    className="flex size-5 items-center justify-center rounded transition-colors"
                    style={{ color: '#5A5F74' }}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onClick() }}
                    >
                      <ExternalLink className="size-3.5" />
                      Open card
                    </DropdownMenuItem>
                    {canEdit && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setDeleteOpen(true) }}
                        >
                          <Trash2 className="size-3.5" />
                          Delete card
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{card.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the card and all its data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
