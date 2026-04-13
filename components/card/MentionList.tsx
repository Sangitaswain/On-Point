'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

interface MentionMember {
  userId: string
  name: string
}

interface MentionListProps {
  items: MentionMember[]
  command: (attrs: { id: string; label: string }) => void
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) command({ id: item.userId, label: item.name })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % Math.max(items.length, 1))
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % Math.max(items.length, 1))
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    return (
      <div className="z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md">
        {items.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">No members found</p>
        ) : (
          items.map((item, index) => (
            <button
              key={item.userId}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectItem(index) }}
              className={`flex w-full items-center rounded px-2 py-1 text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-muted text-foreground'
                  : 'text-foreground/80 hover:bg-muted/50'
              }`}
            >
              @{item.name}
            </button>
          ))
        )}
      </div>
    )
  }
)
MentionList.displayName = 'MentionList'
