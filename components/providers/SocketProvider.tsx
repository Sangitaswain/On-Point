'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { type Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from '@/lib/socket'

const SocketContext = createContext<Socket | null>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const didConnect = useRef(false)

  useEffect(() => {
    if (!isSignedIn || didConnect.current) return

    let mounted = true

    getToken().then((token) => {
      if (!token || !mounted) return
      const s = getSocket(token)
      s.connect()
      setSocket(s)
      didConnect.current = true
    })

    return () => {
      mounted = false
    }
  }, [isSignedIn, getToken])

  useEffect(() => {
    if (!isSignedIn && didConnect.current) {
      disconnectSocket()
      setSocket(null)
      didConnect.current = false
    }
  }, [isSignedIn])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

export function useSocket() {
  return useContext(SocketContext)
}
