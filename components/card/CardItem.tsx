'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Calendar, Trash2, ExternalLink } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
    dueDate?: string
    labels?: CardLabel[]
  }
  onClick: () => void
}

const LABEL_COLOR_DOT: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-400',
  green: 'bg-green-500',
}

function isDueDatePast(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function CardItem({ card, onClick }: CardItemProps) {
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
    opacity: isDragging ? 0.4 : 1,
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
        className="group relative w-full rounded-lg border border-border bg-card px-3 py-2.5 text-left shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
      >
        {/* Top row: drag handle + label dots + three-dot menu */}
        <div className="flex items-center justify-between mb-1.5 min-h-[16px]">
          {/* Drag handle */}
          <button
            type="button"
            {...listeners}
            {...attributes}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-muted-foreground hover:bg-muted touch-none -ml-1 mr-0.5 shrink-0"
            aria-label="Drag card"
          >
            <GripVertical className="size-3" />
          </button>

          {/* Label dots */}
          <div className="flex items-center gap-1 flex-1">
            {labels.slice(0, 5).map((l, i) => (
              <span
                key={i}
                title={l.label}
                className={`inline-block size-2 rounded-full ${LABEL_COLOR_DOT[l.color] ?? 'bg-muted-foreground'}`}
              />
            ))}
          </div>

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
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onClick()
                  }}
                >
                  <ExternalLink className="size-3.5" />
                  Open card
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    setDeleteOpen(true)
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete card
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Card title */}
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
          {card.title}
        </p>

        {/* Footer: due date + assignee avatar */}
        {(hasDueDate || card.assigneeId) && (
          <div className="mt-2 flex items-center gap-2">
            {hasDueDate && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                  isPast ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                <Calendar className="size-3 shrink-0" />
                {formatDueDate(card.dueDate!)}
              </span>
            )}
            {card.assigneeId && (
              <Avatar className="ml-auto size-5">
                <AvatarFallback className="text-[9px]">?</AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{card.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the card and all its data. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
