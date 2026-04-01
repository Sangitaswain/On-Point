'use client'

import { useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface DeleteColumnDialogProps {
  column: {
    _id: Id<'columns'>
    title: string
  }
  cardCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteColumnDialog({
  column,
  cardCount,
  open,
  onOpenChange,
}: DeleteColumnDialogProps) {
  const deleteColumn = useMutation(api.columns.deleteColumn)

  const handleConfirm = useCallback(async () => {
    await deleteColumn({ columnId: column._id })
    onOpenChange(false)
  }, [deleteColumn, column._id, onOpenChange])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete column &ldquo;{column.title}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            {cardCount > 0
              ? `This will permanently delete this column and its ${cardCount} card${cardCount === 1 ? '' : 's'}. This action cannot be undone.`
              : 'This will permanently delete this empty column. This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
