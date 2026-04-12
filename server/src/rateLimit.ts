import Redis from 'ioredis'
import type { Socket } from 'socket.io'

const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  tls: { rejectUnauthorized: false },
})

redis.on('error', (err) => console.error('Redis rateLimit error:', err))

export async function checkRateLimit(socket: Socket, callback: () => void) {
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
}
