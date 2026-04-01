'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import { ConvexError } from 'convex/values'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { LoadingSpinner } from '@/components/loading-spinner'

/**
 * Extract the invite token from a pasted URL or raw token string.
 * Supports formats:
 *   - https://example.com/invite/TOKEN
 *   - /invite/TOKEN
 *   - TOKEN (bare token)
 */
function extractToken(input: string): string {
  const trimmed = input.trim()
  // Try to match /invite/<token> pattern in a URL
  const match = trimmed.match(/\/invite\/([A-Za-z0-9_-]+)\/?$/)
  if (match) return match[1]
  // If it looks like a bare token (no slashes), use it directly
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed
  // Fallback: return as-is and let the backend reject it
  return trimmed
}

export default function OnboardingPage() {
  const router = useRouter()
  const [workspaceName, setWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Join workspace state
  const [inviteInput, setInviteInput] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const workspaces = useQuery(api.workspaces.listMyWorkspaces)
  const createWorkspace = useMutation(api.workspaces.createWorkspace)
  const acceptInvite = useMutation(api.workspaces.acceptInvite)

  // If user already has workspaces, redirect to the first one
  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      const first = workspaces[0]
      if (first && 'slug' in first) {
        router.replace(`/${first.slug}`)
      }
    }
  }, [workspaces, router])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      const trimmed = workspaceName.trim()
      if (!trimmed) {
        setError('Please enter a workspace name.')
        return
      }

      setIsCreating(true)
      try {
        const result = await createWorkspace({ name: trimmed })
        router.push(`/${result.slug}`)
      } catch (err) {
        if (err instanceof ConvexError) {
          const data = err.data as { message?: string }
          setError(data.message ?? 'Something went wrong. Please try again.')
        } else {
          setError('Something went wrong. Please try again.')
        }
        setIsCreating(false)
      }
    },
    [workspaceName, createWorkspace, router]
  )

  const handleJoin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setJoinError(null)

      const token = extractToken(inviteInput)
      if (!token) {
        setJoinError('Please paste an invite link or token.')
        return
      }

      setIsJoining(true)
      try {
        const result = await acceptInvite({ token })
        router.push(`/${result.slug}`)
      } catch (err) {
        if (err instanceof ConvexError) {
          const data = err.data as { message?: string; code?: string }
          if (data.code === 'INVALID_INPUT' && data.message?.includes('already a member')) {
            setJoinError('You are already a member of this workspace.')
          } else {
            setJoinError(data.message ?? 'Invalid or expired invite link.')
          }
        } else {
          setJoinError('Something went wrong. Please try again.')
        }
        setIsJoining(false)
      }
    },
    [inviteInput, acceptInvite, router]
  )

  // Loading state: query hasn't resolved yet, or user record may not exist yet
  if (workspaces === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If user already has workspaces, we're redirecting (useEffect above)
  if (workspaces.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">
            Redirecting to your workspace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome to OnPoint
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first workspace to get started
          </p>
        </div>

        {/* Create Workspace Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                type="text"
                placeholder="e.g. My Team, Acme Corp"
                value={workspaceName}
                onChange={(e) => {
                  setWorkspaceName(e.target.value)
                  if (error) setError(null)
                }}
                disabled={isCreating}
                autoFocus
                autoComplete="off"
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isCreating || !workspaceName.trim()}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner className="size-4" />
                  Creating...
                </span>
              ) : (
                'Create workspace'
              )}
            </Button>
          </form>
        </div>

        {/* Join Workspace Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-medium text-foreground">
                Join a workspace
              </h2>
              <p className="text-sm text-muted-foreground">
                Have an invite link? Paste it below.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-link">Invite link</Label>
              <Input
                id="invite-link"
                type="text"
                placeholder="https://... /invite/token or paste token"
                value={inviteInput}
                onChange={(e) => {
                  setInviteInput(e.target.value)
                  if (joinError) setJoinError(null)
                }}
                disabled={isJoining}
              />
              {joinError && (
                <p className="text-sm text-destructive" role="alert">
                  {joinError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              variant="outline"
              disabled={isJoining || !inviteInput.trim()}
            >
              {isJoining ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner className="size-4" />
                  Joining...
                </span>
              ) : (
                'Join workspace'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
