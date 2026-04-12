import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import type { Server } from 'socket.io'

export async function setupRedisAdapter(io: Server): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_URL
  if (!redisUrl) {
    console.warn('[Socket] No UPSTASH_REDIS_URL — using in-memory adapter')
    return
  }

  try {
    const pubClient = new Redis(redisUrl, {
      tls: { rejectUnauthorized: false },
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })
    const subClient = pubClient.duplicate()

    // Wait for both connections (or fail fast)
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        pubClient.once('ready', resolve)
        pubClient.once('error', reject)
      }),
      new Promise<void>((resolve, reject) => {
        subClient.once('ready', resolve)
        subClient.once('error', reject)
      }),
    ])

    pubClient.on('error', (err) => console.error('[Socket] Redis pub error:', err))
    subClient.on('error', (err) => console.error('[Socket] Redis sub error:', err))

    io.adapter(createAdapter(pubClient, subClient))
    console.log('[Socket] Redis adapter ready')
  } catch (err) {
    console.warn(
      '[Socket] Redis unavailable — using in-memory adapter (single-server mode):',
      (err as Error).message
    )
  }
}
