'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'

import { CardDetailsTab } from './CardDetailsTab'
import { CardHistoryTab } from './CardHistoryTab'
import { CommentThread } from './CommentThread'

interface CardModalProps {
  cardId: string | null
  onClose: () => void
}

export function CardModal({ cardId, onClose }: CardModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const card = useQuery(
    api.cards.get,
    cardId ? { cardId: cardId as Id<'cards'> } : 'skip'
  )

  const deleteCard = useMutation(api.cards.deleteCard)

  const handleDelete = useCallback(async () => {
    if (!cardId) return
    setIsDeleting(true)
    try {
      await deleteCard({ cardId: cardId as Id<'cards'> })
      onClose()
    } catch {
      // Error handling could be extended with toast
    } finally {
      setIsDeleting(false)
    }
  }, [cardId, deleteCard, onClose])

  if (!cardId) return null

  return (
    <Dialog open={!!cardId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{card?.title ?? 'Card'}</DialogTitle>
          <DialogDescription>Card details and history</DialogDescription>
        </DialogHeader>

        {!card ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <CardDetailsTab card={card} />
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <CardHistoryTab cardId={cardId as Id<'cards'>} />
              </TabsContent>
            </Tabs>

            <div className="border-t pt-4">
              <CommentThread cardId={cardId as Id<'cards'>} />
            </div>

            <div className="border-t pt-4">
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2 className="size-4" />
                      {isDeleting ? 'Deleting...' : 'Delete Card'}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this card?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure? This will permanently delete this card and all
                      its comments, labels, and history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
