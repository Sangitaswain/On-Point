import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export function useBoardPermission(boardId: Id<'boards'>) {
  return useQuery(api.boards.getMyPermission, { boardId })
}
