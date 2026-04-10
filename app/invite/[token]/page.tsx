'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ConvexError } from 'convex/values'

import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/loading-spinner'

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token

  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inviteInfo = useQuery(api.workspaces.getInviteByToken, { token })
  const acceptInvite = useMutation(api.workspaces.acceptInvite)

  const handleAccept = async () => {
    setError(null)
    setIsAccepting(true)

    try {
      const result = await acceptInvite({ token })
      setSuccess(true)
      router.push(`/${result.slug}`)
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message?: string }
        setError(data.message ?? 'Something went wrong.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setIsAccepting(false)
    }
  }

  // Still loading invite info
  if (inviteInfo === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">
            Checking invitation...
          </p>
        </div>
      </div>
    )
  }

  // Invalid token
  if (inviteInfo === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="size-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            Invalid Invitation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite link is not valid. It may have been revoked or the URL
            is incorrect.
          </p>
          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={() => router.push('/onboarding')}
          >
            Go to OnPoint
          </Button>
        </div>
      </div>
    )
  }

  // Expired or used
  if (inviteInfo.expired || inviteInfo.used) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <svg
              className="size-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            {inviteInfo.expired
              ? 'Invitation Expired'
              : 'Invitation Already Used'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {inviteInfo.expired
              ? 'This invite link has expired. Please ask the workspace admin for a new one.'
              : 'This invite link has already been used.'}
          </p>
          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={() => router.push('/onboarding')}
          >
            Go to OnPoint
          </Button>
        </div>
      </div>
    )
  }

  // Success state (redirecting)
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">
            Redirecting to workspace...
          </p>
        </div>
      </div>
    )
  }

  // Show invite details with accept button
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="size-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-foreground">
          You have been invited
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You have been invited to join{' '}
          <span className="font-medium text-foreground">
            {inviteInfo.workspaceName}
          </span>{' '}
          as a <span className="font-medium text-foreground">{inviteInfo.role}</span>.
        </p>

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            className="w-full"
            size="lg"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner className="size-4" />
                Accepting...
              </span>
            ) : (
              'Accept Invitation'
            )}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => router.push('/onboarding')}
            disabled={isAccepting}
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  )
}
