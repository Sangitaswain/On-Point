'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Calendar, Trash2, ExternalLink, MessageSquare, Triangle, Diamond, ChevronDown } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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

const LABEL_COLORS: Record<string, string> = {
  red: '#EF4444',
  blue: '#6366F1',
  orange: '#F59E0B',
  purple: '#8B5CF6',
  gray: '#5A5F74',
  green: '#10B981',
}

function isDueDatePast(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function CardItem({ card, onClick, canEdit = true }: CardItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
    try {
      await deleteCard({ cardId: card._id })
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
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
        className="group relative w-full rounded-lg border border-border bg-card/80 px-3 py-2.5 text-left cursor-pointer hover:border-border/80 hover:bg-card hover:shadow-lg hover:shadow-black/20 hover:-translate-y-px transition-all duration-150 animate-slide-in"
      >
        {/* Label strips */}
        {labels.length > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {labels.slice(0, 5).map((l, i) => (
              <span
                key={i}
                title={l.label}
                className="h-1 w-6 rounded-full inline-block"
                style={{ background: LABEL_COLORS[l.color] ?? '#5A5F74' }}
              />
            ))}
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start gap-1.5">
          {canEdit && (
            <button
              type="button"
              {...listeners}
              {...attributes}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-muted-foreground hover:bg-muted touch-none shrink-0 -ml-1"
              aria-label="Drag card"
            >
              <GripVertical className="size-3" />
            </button>
          )}
          <p className="flex-1 text-[13px] font-medium text-foreground line-clamp-2 leading-snug">
            {card.title}
          </p>
          <div
            role="none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger
                aria-label="Card options"
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onClick() }}>
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

        {/* Footer */}
        {(hasDueDate || card.assigneeId) && (
          <div className="mt-2.5 flex items-center gap-2">
            {hasDueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-medium rounded px-1.5 py-0.5',
                  isPast
                    ? 'bg-destructive/15 text-destructive'
                    : 'text-muted-foreground'
                )}
              >
                <Calendar className="size-2.5 shrink-0" />
                {formatDueDate(card.dueDate!)}
              </span>
            )}
            {card.assigneeId && (
              <Avatar className="ml-auto size-5 border border-border" title={card.assigneeName}>
                {card.assigneeAvatarUrl && (
                  <AvatarImage src={card.assigneeAvatarUrl} alt={card.assigneeName} />
                )}
                <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-semibold">
                  {card.assigneeName
                    ? card.assigneeName === '[Removed Member]'
                      ? '?'
                      : card.assigneeName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    : '?'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
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
