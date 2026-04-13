import Redis from 'ioredis'
import type { Socket } from 'socket.io'

const redisUrl = process.env.UPSTASH_REDIS_URL
let redis: Redis | null = null

if (redisUrl) {
  redis = new Redis(redisUrl, {
    tls: { rejectUnauthorized: false },
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  })
  redis.on('error', (err) => console.error('[RateLimit] Redis error:', err))
} else {
  console.warn('[RateLimit] No UPSTASH_REDIS_URL — rate limiting disabled')
}

export async function checkRateLimit(socket: Socket, callback: () => void) {
  if (!redis) {
    callback()
    return
  }

  try {
    const key = `ratelimit:${socket.data.userId}`
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.expire(key, 10)
    }

    if (count > 30) {
      socket.emit('RATE_LIMITED', { message: 'Too many events. Slow down.' })
      return
    }

    callback()
  } catch (err) {
    // Redis unavailable — allow the event through rather than silently dropping it
    console.warn('[RateLimit] Redis error, allowing event through:', (err as Error).message)
    callback()
  }
}
