'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { CalendarDays, X } from 'lucide-react'

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface DueDatePickerProps {
  cardId: Id<'cards'>
  currentDueDate?: string
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isPastDue(iso: string): boolean {
  const due = new Date(iso)
  const now = new Date()
  // Compare date portions only
  due.setHours(23, 59, 59, 999)
  return due < now
}

export function DueDatePicker({ cardId, currentDueDate }: DueDatePickerProps) {
  const [open, setOpen] = useState(false)
  const updateCard = useMutation(api.cards.updateCard)

  const handleSelect = useCallback(
    async (date: Date | undefined) => {
      if (!date) return
      const isoDate = date.toISOString().split('T')[0]
      setOpen(false)
      try {
        await updateCard({ cardId, dueDate: isoDate })
      } catch {
        // Could show toast
      }
    },
    [cardId, updateCard]
  )

  const handleClear = useCallback(async () => {
    setOpen(false)
    try {
      await updateCard({ cardId, dueDate: '' })
    } catch {
      // Could show toast
    }
  }, [cardId, updateCard])

  const pastDue = currentDueDate ? isPastDue(currentDueDate) : false

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'justify-start gap-2 w-full',
              pastDue && 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'
            )}
          >
            <CalendarDays
              className={cn(
                'size-4',
                pastDue ? 'text-red-500' : 'text-muted-foreground'
              )}
            />
            {currentDueDate ? (
              <span>{formatDate(currentDueDate)}</span>
            ) : (
              <span className="text-muted-foreground">No due date</span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col">
          <Calendar
            mode="single"
            selected={currentDueDate ? new Date(currentDueDate) : undefined}
            onSelect={handleSelect}
            initialFocus
          />
          {currentDueDate && (
            <div className="border-t px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center gap-1.5 text-muted-foreground"
                onClick={handleClear}
              >
                <X className="size-3.5" />
                Clear due date
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
