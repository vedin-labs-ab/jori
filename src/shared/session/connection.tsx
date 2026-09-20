import { sessionOptions } from "@better-auth-ui/react"
import { ConvexProvider } from "convex/react"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { authClient, authQueryClient } from "./auth"
import { convex } from "./client"
import {
  ConvexConnectionContext,
  connectConvex,
  disconnectConvex,
  useConvexConnection,
} from "./convex"

const mintToken = async () =>
  (await authClient.convex.token({ fetchOptions: { throw: false } })).data
    ?.token ?? null

/** Connects Convex to the Better Auth session, and says whether it holds.
 *  A failed token fetch stops Convex's refresh loop, so a lost connection
 *  is started again, backing off, for as long as Better Auth still has a
 *  session. */
export function SessionConnection({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const sessionId = session?.session.id
  // Null until Convex has answered for this session.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [failures, setFailures] = useState(0)
  const connect = useCallback(() => {
    setIsAuthenticated(null)
    connectConvex(mintToken, setIsAuthenticated)
  }, [])
  const retry = useCallback(() => {
    setFailures((value) => value + 1)
    connect()
  }, [connect])
  const connected = useCallback(() => {
    setFailures(0)
  }, [])

  useEffect(() => {
    if (isPending) {
      return
    }

    if (sessionId === undefined) {
      setIsAuthenticated(false)
      return
    }

    connect()

    return disconnectConvex
  }, [connect, isPending, sessionId])

  const connection = useMemo(
    () => ({
      isAuthenticated: isAuthenticated === true,
      isLoading: isAuthenticated === null,
    }),
    [isAuthenticated]
  )

  return (
    <ConvexConnectionContext value={connection}>
      <ConvexProvider client={convex}>
        <Reconnect
          delay={Math.min(1_000 * 2 ** failures, 30_000)}
          onConnected={connected}
          onRetry={retry}
        />
        {children}
      </ConvexProvider>
    </ConvexConnectionContext>
  )
}

function Reconnect({
  delay,
  onConnected,
  onRetry,
}: {
  delay: number
  onConnected: () => void
  onRetry: () => void
}) {
  const { isAuthenticated, isLoading } = useConvexConnection()
  const { data: session, refetch } = authClient.useSession()
  const sessionId = session?.session.id

  useEffect(() => {
    if (isAuthenticated) {
      onConnected()
      return
    }
    if (isLoading || !sessionId) {
      return
    }

    return scheduleReconnect(
      delay,
      async () => {
        // Recheck the cookie too: an expired login must reach the sign-in gate.
        await refetch()
        await authQueryClient.invalidateQueries({
          queryKey: sessionOptions(authClient).queryKey,
        })
      },
      onRetry
    )
  }, [
    delay,
    isAuthenticated,
    isLoading,
    onConnected,
    onRetry,
    refetch,
    sessionId,
  ])

  return null
}

function scheduleReconnect(
  delay: number,
  refresh: () => Promise<void>,
  retry: () => void
) {
  let active = true
  let pending = false
  const reconnect = () => {
    if (pending || !navigator.onLine) {
      return
    }
    pending = true
    void refresh()
      .catch(() => undefined)
      .then(() => {
        if (active) {
          retry()
        }
      })
  }
  const resume = () => {
    if (document.visibilityState === "visible") {
      reconnect()
    }
  }
  const timer = window.setTimeout(reconnect, delay)
  window.addEventListener("online", reconnect)
  window.addEventListener("focus", resume)
  document.addEventListener("visibilitychange", resume)

  return () => {
    active = false
    window.clearTimeout(timer)
    window.removeEventListener("online", reconnect)
    window.removeEventListener("focus", resume)
    document.removeEventListener("visibilitychange", resume)
  }
}
