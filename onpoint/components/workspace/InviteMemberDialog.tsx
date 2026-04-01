'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ConvexError } from 'convex/values'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import { CheckIcon, CopyIcon, LinkIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type InviteMemberDialogProps = {
  workspaceId: Id<'workspaces'>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteMemberDialog({
  workspaceId,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const [role, setRole] = useState<'admin' | 'member' | 'guest'>('member')
  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInvite = useMutation(api.workspaces.createInvite)

  const handleGenerate = async () => {
    setError(null)
    setIsGenerating(true)

    try {
      const result = await createInvite({
        workspaceId,
        role,
        invitedEmail: email.trim() || undefined,
      })

      const link = `${window.location.origin}/invite/${result.token}`
      setInviteLink(link)
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string }
        setError(data.message ?? 'Failed to create invite.')
      } else {
        setError('Failed to create invite.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('Invite link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset state when closing
      setRole('member')
      setEmail('')
      setInviteLink(null)
      setCopied(false)
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleRoleChange = (value: string | null) => {
    if (value) {
      setRole(value as 'admin' | 'member' | 'guest')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>
            Generate an invite link to share with someone you want to add to
            this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role selector */}
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={role}
              onValueChange={handleRoleChange}
              disabled={!!inviteLink}
            >
              <SelectTrigger className="w-full" id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional email */}
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email (optional)</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!inviteLink}
            />
            <p className="text-xs text-muted-foreground">
              Optionally restrict this invite to a specific email address.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* Generated invite link */}
          {inviteLink && (
            <div className="space-y-2">
              <Label>Invite link</Label>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-2">
                  <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm text-foreground">
                    {inviteLink}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy invite link"
                >
                  {copied ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in 7 days.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {!inviteLink ? (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="size-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate Invite Link'
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
