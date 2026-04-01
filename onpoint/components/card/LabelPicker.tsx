'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Tags } from 'lucide-react'

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const PREDEFINED_LABELS = [
  { label: 'Bug', color: 'red' },
  { label: 'Feature', color: 'blue' },
  { label: 'Urgent', color: 'orange' },
  { label: 'Design', color: 'purple' },
  { label: 'Blocked', color: 'gray' },
  { label: 'Done', color: 'green' },
] as const

const COLOR_MAP: Record<string, { dot: string; bg: string; text: string }> = {
  red: { dot: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-300' },
  blue: { dot: 'bg-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300' },
  orange: { dot: 'bg-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300' },
  purple: { dot: 'bg-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300' },
  gray: { dot: 'bg-gray-500', bg: 'bg-gray-100 dark:bg-gray-500/20', text: 'text-gray-700 dark:text-gray-300' },
  green: { dot: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-300' },
}

interface CardLabel {
  _id: string
  cardId: string
  label: string
  color: string
}

interface LabelPickerProps {
  cardId: Id<'cards'>
  currentLabels: CardLabel[]
}

export function LabelPicker({ cardId, currentLabels }: LabelPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentLabels.map((l) => l.label))
  )
  const prevSelectedRef = useRef<Set<string>>(selected)

  const setCardLabels = useMutation(api.cards.setCardLabels)

  const handleToggle = useCallback(
    (labelName: string) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(labelName)) {
          next.delete(labelName)
        } else {
          next.add(labelName)
        }
        return next
      })
    },
    []
  )

  const handleOpenChange = useCallback(
    async (open: boolean) => {
      if (!open) {
        // Check if selection has changed
        const prev = prevSelectedRef.current
        const hasChanged =
          selected.size !== prev.size ||
          [...selected].some((l) => !prev.has(l))

        if (hasChanged) {
          const labels = PREDEFINED_LABELS.filter((l) =>
            selected.has(l.label)
          ).map((l) => ({ label: l.label, color: l.color }))

          try {
            await setCardLabels({ cardId, labels })
          } catch {
            // Revert on error
            setSelected(prev)
          }
          prevSelectedRef.current = new Set(selected)
        }
      }
    },
    [selected, cardId, setCardLabels]
  )

  return (
    <div className="flex flex-col gap-2">
      <Popover onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="justify-start gap-2 w-full">
              <Tags className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {selected.size > 0 ? `${selected.size} selected` : 'Add labels'}
              </span>
            </Button>
          }
        />
        <PopoverContent className="w-56 p-2">
          <div className="flex flex-col gap-1">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Labels
            </p>
            {PREDEFINED_LABELS.map((item) => {
              const colors = COLOR_MAP[item.color]
              const isChecked = selected.has(item.label)

              return (
                <label
                  key={item.label}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(item.label)}
                    className="size-3.5 rounded border-border accent-primary"
                  />
                  <span
                    className={`size-2.5 rounded-full ${colors.dot}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Display selected labels as badges */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1">
          {PREDEFINED_LABELS.filter((l) => selected.has(l.label)).map(
            (item) => {
              const colors = COLOR_MAP[item.color]
              return (
                <Badge
                  key={item.label}
                  variant="secondary"
                  className={`${colors.bg} ${colors.text} border-0 text-xs`}
                >
                  <span
                    className={`size-1.5 rounded-full ${colors.dot}`}
                    aria-hidden="true"
                  />
                  {item.label}
                </Badge>
              )
            }
          )}
        </div>
      )}
    </div>
  )
}
