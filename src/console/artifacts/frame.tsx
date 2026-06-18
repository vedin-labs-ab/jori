import { useAction } from "convex/react"
import { CheckCircle2, Clock3 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { api } from "../../../convex/_generated/api"
import { FullscreenSkeletonLoader } from "../loading"
import { type ArtifactDetail } from "./types"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL
const artifactFrameSandbox =
  "allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
type ArtifactId = ArtifactDetail["artifactId"]
type ArtifactVersionId = ArtifactDetail["versionId"]

export function ArtifactFrame({
  artifact,
  tenantId,
  variant = "panel",
}: {
  artifact: ArtifactDetail
  tenantId: string
  variant?: "panel" | "fullscreen"
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { error, frameSrc, isReady, postToken } = useArtifactFrameSession({
    artifact,
    iframeRef,
    tenantId,
  })

  if (frameSrc === undefined) {
    return (
      <Alert
        className={variant === "fullscreen" ? "m-4" : undefined}
        variant="destructive"
      >
        <AlertTitle>Missing render host</AlertTitle>
        <AlertDescription>
          Set VITE_CONVEX_SITE_URL to render artifacts.
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
            <AlertTitle>Artifact session failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <iframe
          className="absolute inset-0 h-full w-full bg-background"
          onLoad={postToken}
          ref={iframeRef}
          sandbox={artifactFrameSandbox}
          src={frameSrc}
          title={artifact.title}
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
          <AlertTitle>Artifact session failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <iframe
        className="h-full min-h-[30rem] w-full bg-background"
        onLoad={postToken}
        ref={iframeRef}
        sandbox={artifactFrameSandbox}
        src={frameSrc}
        title={artifact.title}
      />
    </section>
  )
}

function useArtifactFrameSession({
  artifact,
  iframeRef,
  tenantId,
}: {
  artifact: ArtifactDetail
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  tenantId: string
}) {
  const createSession = useAction(api.artifacts.actions.createSession)
  const [session, setSession] = useState<ArtifactSession>()
  const [error, setError] = useState<string>()
  const [isReady, setIsReady] = useState(false)
  const frameSrc = useArtifactFrameSrc(artifact.artifactId)
  const postToken = useCallback(() => {
    const contentWindow = iframeRef.current?.contentWindow

    if (session === undefined || contentWindow == null) {
      return
    }

    contentWindow.postMessage(
      { type: "milo:artifact-token", token: session.token },
      convexSiteUrl
    )
  }, [iframeRef, session])

  useCreateArtifactSession({
    artifact,
    createSession,
    setError,
    setIsReady,
    setSession,
    tenantId,
  })
  useArtifactFrameMessages({
    artifactId: artifact.artifactId,
    setError,
    setIsReady,
  })
  useEffect(() => postToken(), [postToken])

  return { error, frameSrc, isReady, postToken }
}

function useArtifactFrameSrc(artifactId: ArtifactId) {
  return useMemo(() => {
    if (convexSiteUrl === undefined || convexSiteUrl === "") {
      return undefined
    }

    return new URL(`/artifacts/render/${artifactId}`, convexSiteUrl).toString()
  }, [artifactId])
}

function useCreateArtifactSession({
  artifact,
  createSession,
  setError,
  setIsReady,
  setSession,
  tenantId,
}: {
  artifact: ArtifactDetail
  createSession: ReturnType<
    typeof useAction<typeof api.artifacts.actions.createSession>
  >
  setError: (error: string | undefined) => void
  setIsReady: (ready: boolean) => void
  setSession: (session: ArtifactSession) => void
  tenantId: string
}) {
  useEffect(() => {
    let active = true

    setError(undefined)
    setIsReady(false)
    void createSession({ tenantId, artifactId: artifact.artifactId })
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
  }, [
    artifact.artifactId,
    createSession,
    setError,
    setIsReady,
    setSession,
    tenantId,
  ])
}

function useArtifactFrameMessages({
  artifactId,
  setError,
  setIsReady,
}: {
  artifactId: ArtifactId
  setError: (error: string | undefined) => void
  setIsReady: (ready: boolean) => void
}) {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== convexSiteUrl) {
        return
      }

      if (
        event.data?.type === "milo:artifact-ready" &&
        event.data.artifactId === artifactId
      ) {
        setIsReady(true)
      }

      if (
        event.data?.type === "milo:artifact-error" &&
        event.data.artifactId === artifactId
      ) {
        setError("The artifact frame failed to load.")
      }
    }

    window.addEventListener("message", handleMessage)

    return () => window.removeEventListener("message", handleMessage)
  }, [artifactId, setError, setIsReady])
}

type ArtifactSession = {
  token: string
  versionId: ArtifactVersionId
  expiresAt: number
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Artifact request failed."
}
