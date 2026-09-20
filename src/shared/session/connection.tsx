import { sessionOptions } from "@better-auth-ui/react"
import {
  type AuthClient as ConvexAuthClient,
  ConvexBetterAuthProvider,
} from "@convex-dev/better-auth/react"
import { useConvexAuth } from "convex/react"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import { authClient, authQueryClient } from "./auth"
import { convex } from "./client"
import { useConnectionEpoch } from "./epoch"

/** A failed token fetch stops Convex's refresh loop. Recreate its auth
 * provider to restart that loop while Better Auth still has a session. The
 * provider is recreated the same way when another organization is
 * activated, so its token is minted for the new claim. */
export function SessionConnection({ children }: { children: ReactNode }) {
  const epoch = useConnectionEpoch()
  const [generation, setGeneration] = useState(0)
  const [failures, setFailures] = useState(0)
  const retry = useCallback(() => {
    setFailures((value) => value + 1)
    setGeneration((value) => value + 1)
  }, [])
  const connected = useCallback(() => {
    setFailures(0)
  }, [])

  return (
    <ConvexBetterAuthProvider
      key={`${epoch}:${generation}`}
      authClient={authClient as unknown as ConvexAuthClient}
      client={convex}
    >
      <Reconnect
        delay={Math.min(1_000 * 2 ** failures, 30_000)}
        onConnected={connected}
        onRetry={retry}
      />
      {children}
    </ConvexBetterAuthProvider>
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
  const { isAuthenticated, isLoading } = useConvexAuth()
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
