import { createServer } from 'http'
import { Server } from 'socket.io'
import { setupRedisAdapter } from './redis'
import { authMiddleware } from './middleware/auth'
import { handleConnection } from './handlers/connection'

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true,
  },
})

setupRedisAdapter(io)
io.use(authMiddleware)
io.on('connection', handleConnection)

const PORT = process.env.PORT ?? 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`)
})
