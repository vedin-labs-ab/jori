import { AlertTriangle } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { FullscreenSkeletonLoader } from "../shared/loading"
import { ArtifactFrame } from "./frame"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type ShareSession = {
  token: string
  title: string
  expiresAt: number
}

type ShareExchange =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; session: ShareSession }

/** Views an artifact through a share link, without a signed-in session. The
 *  secret from the URL fragment is exchanged for a short-lived view-only
 *  session; everything else reuses the member frame. */
export function ArtifactShareView({
  artifactId,
  secret,
}: {
  artifactId: string
  secret: string
}) {
  const exchange = useShareExchange(artifactId, secret)

  if (exchange.status === "loading") {
    return <FullscreenSkeletonLoader aria-label="Loading artifact" />
  }

  if (exchange.status === "error") {
    return <ShareUnavailable artifactId={artifactId} />
  }

  return <ShareFrame artifactId={artifactId} session={exchange.session} />
}

function ShareFrame({
  artifactId,
  session,
}: {
  artifactId: string
  session: ShareSession
}) {
  const mintSession = useCallback(
    () => Promise.resolve({ token: session.token }),
    [session.token]
  )

  return (
    <main className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <h1 className="truncate font-medium text-sm">{session.title}</h1>
        <Button asChild size="sm" variant="outline">
          <a href={`/artifacts/${encodeURIComponent(artifactId)}`}>
            Open in Milo
          </a>
        </Button>
      </header>
      <ArtifactFrame
        artifactId={artifactId}
        mintSession={mintSession}
        title={session.title}
        variant="fullscreen"
      />
    </main>
  )
}

function ShareUnavailable({ artifactId }: { artifactId: string }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <AlertTriangle className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="font-medium text-lg">
          This link is no longer available
        </h1>
        <p className="text-muted-foreground text-sm">
          The share link may have expired or been revoked.
        </p>
      </div>
      <Button asChild variant="outline">
        <a href={`/artifacts/${encodeURIComponent(artifactId)}`}>
          Open in Milo
        </a>
      </Button>
    </main>
  )
}

function useShareExchange(artifactId: string, secret: string) {
  const [exchange, setExchange] = useState<ShareExchange>({
    status: "loading",
  })

  useEffect(() => {
    let active = true

    setExchange({ status: "loading" })
    void exchangeShareSecret(artifactId, secret)
      .then((session) => {
        if (active) {
          setExchange({ status: "ready", session })
        }
      })
      .catch(() => {
        if (active) {
          setExchange({ status: "error" })
        }
      })

    return () => {
      active = false
    }
  }, [artifactId, secret])

  return exchange
}

async function exchangeShareSecret(
  artifactId: string,
  secret: string
): Promise<ShareSession> {
  if (convexSiteUrl === undefined || convexSiteUrl === "") {
    throw new Error("Missing render host.")
  }

  const response = await fetch(new URL("/artifacts/share", convexSiteUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ artifactId, secret }),
  })

  if (!response.ok) {
    throw new Error("The share link was rejected.")
  }

  return (await response.json()) as ShareSession
}
