import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import type { Server } from 'socket.io'

export function setupRedisAdapter(io: Server) {
  const pubClient = new Redis(process.env.UPSTASH_REDIS_URL!, {
    tls: { rejectUnauthorized: false },
  })
  const subClient = pubClient.duplicate()

  pubClient.on('error', (err) => console.error('Redis pub error:', err))
  subClient.on('error', (err) => console.error('Redis sub error:', err))

  io.adapter(createAdapter(pubClient, subClient))
}
