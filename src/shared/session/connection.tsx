import { sessionOptions } from "@better-auth-ui/react"
import { ConvexHttpClient } from "convex/browser"
import { ConvexProvider } from "convex/react"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { api } from "../../../convex/_generated/api"
import { localTimezone } from "../console/time"
import { authClient, authQueryClient } from "./auth"
import { convex, convexUrl } from "./client"
import {
  type ConvexConnection,
  ConvexConnectionContext,
  connectConvex,
  disconnectConvex,
  useConvexConnection,
} from "./convex"

const mintToken = async () =>
  (await authClient.convex.token({ fetchOptions: { throw: false } })).data
    ?.token ?? null

/** Commits the member's person and identity links in the organization. It
 *  goes over HTTP with the new token, since the socket is held until the
 *  organization has been entered. */
async function prepareMember(token: string, organizationId: string) {
  const http = new ConvexHttpClient(convexUrl)

  http.setAuth(token)
  await http.mutation(api.persons.account.sync, {
    organizationId,
    timezone: localTimezone(),
  })
}

/** Reads the organization again, and waits for the page to have taken it
 *  in: the query cache tells its observers on a timer, and React commits in
 *  the turn after that. */
async function followOrganization() {
  await authQueryClient.refetchQueries({
    predicate: (query) => query.queryKey.includes("organization"),
  })
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** Connects Convex to the Better Auth session, and says whether it holds.
 *  A failed token fetch stops Convex's refresh loop, so a lost connection
 *  is started again, backing off, for as long as Better Auth still has a
 *  session. */
export function SessionConnection({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const sessionId = session?.session.id
  // Null until Convex has answered for this session.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [preparation, setPreparation] =
    useState<ConvexConnection["preparation"]>("pending")
  const [failures, setFailures] = useState(0)
  const connect = useCallback(() => {
    setIsAuthenticated(null)
    setPreparation("pending")
    connectConvex({
      follow: followOrganization,
      mint: mintToken,
      onChange: setIsAuthenticated,
      onPreparation: setPreparation,
      prepare: prepareMember,
    })
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
      preparation,
    }),
    [isAuthenticated, preparation]
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
