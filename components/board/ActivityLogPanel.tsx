'use client'

import { useState } from 'react'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { X, Activity } from 'lucide-react'
import { formatActivityEntry } from '@/lib/formatActivityEntry'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  boardId: Id<'boards'>
  open: boolean
  onClose: () => void
}

const ACTION_TYPES = [
  { value: '', label: 'All actions' },
  { value: 'CARD_CREATED', label: 'Card created' },
  { value: 'CARD_UPDATED', label: 'Card updated' },
  { value: 'CARD_MOVED', label: 'Card moved' },
  { value: 'CARD_DELETED', label: 'Card deleted' },
  { value: 'COLUMN_CREATED', label: 'Column created' },
  { value: 'COLUMN_UPDATED', label: 'Column updated' },
  { value: 'COLUMN_DELETED', label: 'Column deleted' },
  { value: 'COMMENT_ADDED', label: 'Comment added' },
]

export function ActivityLogPanel({ boardId, open, onClose }: Props) {
  const [actionType, setActionType] = useState('')
  const [actorId, setActorId] = useState<Id<'users'> | ''>('')

  const members = useQuery(api.boards.getMembers, open ? { boardId } : 'skip')

  const { results, status, loadMore } = usePaginatedQuery(
    api.activityLogs.listByBoard,
    open
      ? {
          boardId,
          actionType: actionType || undefined,
          actorId: (actorId as Id<'users'>) || undefined,
        }
      : 'skip',
    { initialNumItems: 20 }
  )

  if (!open) return null

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="size-4" />
          Activity
        </div>
        <button onClick={onClose} className="rounded p-0.5 hover:bg-muted" aria-label="Close activity">
          <X className="size-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-1.5 border-b px-3 py-2">
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none"
        >
          {ACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={actorId}
          onChange={(e) => setActorId(e.target.value as Id<'users'> | '')}
          className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none"
        >
          <option value="">All members</option>
          {members?.map((m) => (
            <option key={m.userId} value={m.userId}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto py-1">
        {results.length === 0 && status !== 'LoadingFirstPage' ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          results.map((entry) => (
            <div key={entry._id} className="flex items-start gap-2 px-3 py-2">
              {/* Avatar */}
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {entry.actorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.actorAvatarUrl} alt="" className="size-6 rounded-full object-cover" />
                ) : (
                  (entry.actorName?.[0] ?? '?').toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs">
                  <span className="font-medium">{entry.actorName}</span>{' '}
                  {formatActivityEntry(entry.actionType, entry.metadata as Record<string, unknown>)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(entry._creationTime), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}

        {status === 'CanLoadMore' && (
          <button
            onClick={() => loadMore(20)}
            className="mx-auto mb-2 mt-1 block rounded-md px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Load more
          </button>
        )}
        {status === 'LoadingMore' && (
          <p className="py-2 text-center text-xs text-muted-foreground">Loading...</p>
        )}
      </div>
    </div>
  )
}
