'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function BoardError({ error }: { error: Error; reset: () => void }) {
  const params = useParams<{ workspaceSlug: string }>()
  const isForbidden = error.message?.includes('FORBIDDEN') || error.message?.includes('Insufficient permission')

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div
          style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'oklch(62% 0.22 263 / 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}
        >
          {isForbidden ? '🔒' : '⚠️'}
        </div>
        <p className="text-lg font-semibold" style={{ color: '#E4E7F0' }}>
          {isForbidden ? 'Access denied' : 'Something went wrong'}
        </p>
        <p className="text-sm" style={{ color: '#9499AE' }}>
          {isForbidden
            ? "You don't have permission to view this board."
            : error.message}
        </p>
        <Link
          href={`/${params?.workspaceSlug ?? ''}`}
          style={{
            marginTop: 8,
            padding: '7px 16px',
            background: 'oklch(62% 0.22 263)',
            borderRadius: 7,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Back to workspace
        </Link>
      </div>
    </div>
  )
}
