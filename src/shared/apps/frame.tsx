import { viewFragment } from "@contracts/apps/share"
import { CheckCircle2, Clock3 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { FullscreenSkeletonLoader } from "@/shared/loading"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL
const appFrameSandbox =
  "allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"

type AppSession = { token: string }

/** How the frame gets a session is the caller's edge: members mint through
 *  the member-authed action, share links exchange their secret. */
type MintAppSession = () => Promise<AppSession>

export function AppFrame({
  appId,
  title,
  mintSession,
  variant = "panel",
}: {
  appId: string
  title: string
  mintSession: MintAppSession
  variant?: "panel" | "fullscreen"
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { error, frameSrc, isReady, postToken } = useAppFrameSession({
    appId,
    iframeRef,
    mintSession,
  })

  if (frameSrc === undefined) {
    return (
      <Alert
        className={variant === "fullscreen" ? "m-4" : undefined}
        variant="destructive"
      >
        <AlertTitle>Missing render host</AlertTitle>
        <AlertDescription>
          Set VITE_CONVEX_SITE_URL to render apps.
        </AlertDescription>
      </Alert>
    )
  }

  if (variant === "fullscreen") {
    return (
      <section className="relative min-h-0 flex-1 bg-background">
        {error === undefined ? null : (
          <Alert
            className="-translate-x-1/2 absolute top-16 left-1/2 z-20 w-[min(34rem,calc(100%-2rem))]"
            variant="destructive"
          >
            <AlertTitle>App session failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <iframe
          className="absolute inset-0 h-full w-full bg-background"
          onLoad={postToken}
          ref={iframeRef}
          sandbox={appFrameSandbox}
          src={frameSrc}
          title={title}
        />
        {isReady || error !== undefined ? null : (
          <FullscreenSkeletonLoader
            className="absolute inset-0 z-40"
            mode="fill"
          />
        )}
      </section>
    )
  }

  return (
    <section className="grid min-h-[34rem] overflow-hidden rounded-md border bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          {isReady ? (
            <CheckCircle2 className="size-4 text-green-600" />
          ) : (
            <Clock3 className="size-4 text-muted-foreground" />
          )}
          <span className="truncate">
            {isReady ? "Running" : "Starting session"}
          </span>
        </div>
        <Badge variant="outline">Sandboxed iframe</Badge>
      </div>
      {error === undefined ? null : (
        <Alert className="m-3" variant="destructive">
          <AlertTitle>App session failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <iframe
        className="h-full min-h-[30rem] w-full bg-background"
        onLoad={postToken}
        ref={iframeRef}
        sandbox={appFrameSandbox}
        src={frameSrc}
        title={title}
      />
    </section>
  )
}

function useAppFrameSession({
  appId,
  iframeRef,
  mintSession,
}: {
  appId: string
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  mintSession: MintAppSession
}) {
  const [session, setSession] = useState<AppSession>()
  const [error, setError] = useState<string>()
  const [isReady, setIsReady] = useState(false)
  const frameSrc = useAppFrameSrc(appId)
  const postToken = useCallback(() => {
    const contentWindow = iframeRef.current?.contentWindow

    if (session === undefined || contentWindow == null) {
      return
    }

    contentWindow.postMessage(
      { type: "jori:app-token", token: session.token },
      convexSiteUrl
    )
  }, [iframeRef, session])

  useMintAppSession({ mintSession, setError, setIsReady, setSession })
  useAppFrameMessages({ appId, setError, setIsReady })
  useEffect(() => postToken(), [postToken])

  return { error, frameSrc, isReady, postToken }
}

/**
 * The render URL, forwarding any view params from the console URL's fragment
 * onto the frame's own fragment: the page is cross-origin and cannot read
 * our location, and fragments keep the params out of request logs.
 */
function useAppFrameSrc(appId: string) {
  return useMemo(() => {
    if (convexSiteUrl === undefined || convexSiteUrl === "") {
      return undefined
    }

    const url = new URL(`/apps/render/${appId}`, convexSiteUrl).toString()
    const view =
      typeof window === "undefined" ? null : viewFragment(window.location.hash)

    return view === null ? url : `${url}#${view}`
  }, [appId])
}

function useMintAppSession({
  mintSession,
  setError,
  setIsReady,
  setSession,
}: {
  mintSession: MintAppSession
  setError: (error: string | undefined) => void
  setIsReady: (ready: boolean) => void
  setSession: (session: AppSession) => void
}) {
  useEffect(() => {
    let active = true

    setError(undefined)
    setIsReady(false)
    void mintSession()
      .then((created) => {
        if (active) {
          setSession(created)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(readErrorMessage(caught))
        }
      })

    return () => {
      active = false
    }
  }, [mintSession, setError, setIsReady, setSession])
}

function useAppFrameMessages({
  appId,
  setError,
  setIsReady,
}: {
  appId: string
  setError: (error: string | undefined) => void
  setIsReady: (ready: boolean) => void
}) {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== convexSiteUrl) {
        return
      }

      if (event.data?.type === "jori:app-ready" && event.data.appId === appId) {
        setIsReady(true)
      }

      if (event.data?.type === "jori:app-error" && event.data.appId === appId) {
        setError("The app frame failed to load.")
      }
    }

    window.addEventListener("message", handleMessage)

    return () => window.removeEventListener("message", handleMessage)
  }, [appId, setError, setIsReady])
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "App request failed."
}
