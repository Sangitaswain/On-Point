'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { UserCircle, X } from 'lucide-react'

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface AssigneePickerProps {
  cardId: Id<'cards'>
  currentAssigneeId?: Id<'users'>
  boardId: Id<'boards'>
  disabled?: boolean
}

export function AssigneePicker({
  cardId,
  currentAssigneeId,
  boardId,
  disabled = false,
}: AssigneePickerProps) {
  const [open, setOpen] = useState(false)

  const board = useQuery(api.boards.get, { boardId })
  const members = useQuery(
    api.workspaces.listMembers,
    board?.workspaceId ? { workspaceId: board.workspaceId } : 'skip'
  )

  const currentAssignee = members?.find((m) => m.userId === currentAssigneeId)

  const updateCard = useMutation(api.cards.updateCard)

  const handleSelect = useCallback(
    async (userId: string | null) => {
      setOpen(false)
      try {
        if (userId) {
          await updateCard({ cardId, assigneeId: userId as Id<'users'> })
        } else {
          // Remove assignee - pass undefined to clear
          await updateCard({ cardId })
        }
      } catch {
        // Could show toast
      }
    },
    [cardId, updateCard]
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" disabled={disabled} className="justify-start gap-2 w-full">
            {currentAssigneeId && !currentAssignee && members !== undefined ? (
              // Assigned to someone who is no longer a member
              <>
                <UserCircle className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground italic">[Removed Member]</span>
              </>
            ) : currentAssignee ? (
              <>
                <Avatar size="sm">
                  {currentAssignee.avatarUrl && (
                    <AvatarImage src={currentAssignee.avatarUrl} alt={currentAssignee.name} />
                  )}
                  <AvatarFallback>{getInitials(currentAssignee.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{currentAssignee.name}</span>
              </>
            ) : (
              <>
                <UserCircle className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Unassigned</span>
              </>
            )}
          </Button>
        }
      />
      <PopoverContent className="p-0 w-64">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              {currentAssigneeId && (
                <CommandItem
                  onSelect={() => handleSelect(null)}
                  className="gap-2 text-muted-foreground"
                >
                  <X className="size-4" />
                  Remove assignee
                </CommandItem>
              )}
              {members?.map((member) => (
                <CommandItem
                  key={member.userId}
                  value={member.name}
                  onSelect={() => handleSelect(member.userId)}
                  data-checked={member.userId === currentAssigneeId}
                  className="gap-2"
                >
                  <Avatar size="sm">
                    {member.avatarUrl && (
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                    )}
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm">{member.name}</span>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
