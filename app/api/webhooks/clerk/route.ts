import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    return new Response('Missing CLERK_WEBHOOK_SECRET', { status: 500 })
  }

  // ── Verify svix signature ───────────────────────────────────────────────
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  // ── Handle events ───────────────────────────────────────────────────────
  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    await convex.mutation(api.users.createUser, {
      clerkId: id,
      email: email_addresses[0].email_address,
      name: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
      avatarUrl: image_url ?? undefined,
    })
  }

  if (evt.type === 'user.updated') {
    const { id, first_name, last_name, image_url } = evt.data
    await convex.mutation(api.users.updateUser, {
      clerkId: id,
      name: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
      avatarUrl: image_url ?? undefined,
    })
  }

  return new Response('OK', { status: 200 })
}
