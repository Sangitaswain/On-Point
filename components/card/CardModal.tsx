'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { MoreHorizontal, Trash2, Clock } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

import { CardDetailsTab } from './CardDetailsTab'
import { CardHistoryTab } from './CardHistoryTab'
import { CommentThread } from './CommentThread'
import { AssigneePicker } from './AssigneePicker'
import { LabelPicker } from './LabelPicker'
import { DueDatePicker } from './DueDatePicker'
import { useSocket } from '@/components/providers/SocketProvider'

interface CardModalProps {
  cardId: string | null
  onClose: () => void
}

export function CardModal({ cardId, onClose }: CardModalProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const card = useQuery(
    api.cards.get,
    cardId ? { cardId: cardId as Id<'cards'> } : 'skip'
  )

  // Check what permission the current user has on this board
  const myPermission = useQuery(
    api.boards.getMyPermission,
    card ? { boardId: card.boardId } : 'skip'
  )

  // Only 'edit' permission holders can delete cards
  const canDelete = myPermission === 'edit'

  const deleteCard = useMutation(api.cards.deleteCard)
  const socket = useSocket()

  const handleDelete = useCallback(async () => {
    if (!cardId || !card) return
    setIsDeleting(true)
    try {
      await deleteCard({ cardId: cardId as Id<'cards'> })
      socket?.emit('CARD_DELETED', { boardId: card.boardId, cardId })
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }, [cardId, card, deleteCard, socket, onClose])

  if (!cardId) return null

  return (
    <>
      <Dialog open={!!cardId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden max-h-[88vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>{card?.title ?? 'Card'}</DialogTitle>
            <DialogDescription>Card details</DialogDescription>
          </DialogHeader>

          {!card ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : (
            <div className="flex max-h-[88vh] overflow-hidden">

              {/* ── Main content ─────────────────────────── */}
              <div className="flex flex-1 flex-col overflow-y-auto min-w-0">
                {/* Header row: three-dot menu sits here, to the left of the dialog's X button */}
                {canDelete && (
                  <div className="flex justify-end px-4 pt-4 pb-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label="Card actions"
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setShowDeleteAlert(true)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete card
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <div className="flex flex-col gap-6 px-6 pb-6 pt-4">
                  <CardDetailsTab card={card} />
                </div>

                <div className="border-t border-border px-6 py-5">
                  <CommentThread cardId={cardId as Id<'cards'>} boardId={card.boardId} />
                </div>
              </div>

              {/* ── Right sidebar ─────────────────────────── */}
              <div className="flex w-[200px] shrink-0 flex-col border-l border-border bg-muted/20 overflow-y-auto">
                <div className="flex flex-col gap-5 p-4">

                  {/* Assignee */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Assignee
                    </p>
                    <AssigneePicker
                      cardId={card._id}
                      currentAssigneeId={card.assigneeId}
                      boardId={card.boardId}
                    />
                  </div>

                  {/* Labels */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Labels
                    </p>
                    <LabelPicker cardId={card._id} currentLabels={card.labels} />
                  </div>

                  {/* Due date */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Due date
                    </p>
                    <DueDatePicker cardId={card._id} currentDueDate={card.dueDate} />
                  </div>

                  {/* History toggle */}
                  <div className="border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => setShowHistory((v) => !v)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Clock className="size-3.5 shrink-0" />
                      {showHistory ? 'Hide history' : 'View history'}
                    </button>

                    {showHistory && (
                      <div className="mt-3">
                        <CardHistoryTab cardId={cardId as Id<'cards'>} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — rendered outside Dialog to avoid nesting issues */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the card, all comments, labels, and history.
              This cannot be undone.
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
