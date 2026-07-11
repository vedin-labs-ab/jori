import { Link } from "@tanstack/react-router"
import { useAction, useMutation, useQuery } from "convex/react"
import { AlertTriangle, ArrowLeft, Link2 } from "lucide-react"
import { type ReactNode, useCallback } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SessionProviders } from "@/shared/providers"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { showErrorToast } from "../shared/error"
import { FullscreenSkeletonLoader } from "../shared/loading"
import { absoluteTime } from "../shared/time"
import { ArtifactFrame } from "./frame"
import { type ArtifactDetail } from "./types"

type ArtifactId = ArtifactDetail["artifactId"]

/** The artifact route sits outside the root session stack so share-link
 *  visitors skip Clerk entirely; the member view brings it back here. */
export function ArtifactView({ artifactId }: { artifactId: ArtifactId }) {
  return (
    <SessionProviders>
      <ConsolePage chrome="none" loadingFallback={<ArtifactViewLoading />}>
        {(tenantId) => (
          <ArtifactViewContent artifactId={artifactId} tenantId={tenantId} />
        )}
      </ConsolePage>
    </SessionProviders>
  )
}

function ArtifactViewContent({
  artifactId,
  tenantId,
}: {
  artifactId: ArtifactId
  tenantId: string
}) {
  const artifactResult = useQuery(api.artifacts.console.get, {
    tenantId,
    artifactId,
  })

  if (artifactResult === undefined) {
    return <ArtifactViewLoading />
  }

  if (artifactResult.status === "unauthorized") {
    return (
      <ArtifactFullscreenShell>
        <Alert variant="destructive">
          <AlertTitle>Could not load artifact</AlertTitle>
          <AlertDescription>{artifactResult.message}</AlertDescription>
        </Alert>
      </ArtifactFullscreenShell>
    )
  }

  if (
    artifactResult.status === "not_found" ||
    artifactResult.artifact === null
  ) {
    return (
      <ArtifactFullscreenShell>
        <Alert>
          <AlertTriangle />
          <AlertTitle>Artifact not found</AlertTitle>
          <AlertDescription>
            The artifact may have been deleted or belongs to another
            organization.
          </AlertDescription>
        </Alert>
      </ArtifactFullscreenShell>
    )
  }

  return (
    <PublishedArtifactView
      artifact={artifactResult.artifact}
      tenantId={tenantId}
    />
  )
}

function ArtifactViewLoading() {
  return <FullscreenSkeletonLoader aria-label="Loading artifact" />
}

function PublishedArtifactView({
  artifact,
  tenantId,
}: {
  artifact: ArtifactDetail
  tenantId: string
}) {
  const createSession = useAction(api.artifacts.actions.createSession)
  const mintSession = useCallback(
    () => createSession({ tenantId, artifactId: artifact.artifactId }),
    [artifact.artifactId, createSession, tenantId]
  )

  return (
    <ArtifactFullscreenShell>
      {artifact.shares === null ? null : (
        <ArtifactShareChip
          artifactId={artifact.artifactId}
          shares={artifact.shares}
          tenantId={tenantId}
        />
      )}
      <ArtifactFrame
        artifactId={artifact.artifactId}
        mintSession={mintSession}
        title={artifact.title}
        variant="fullscreen"
      />
    </ArtifactFullscreenShell>
  )
}

function ArtifactShareChip({
  artifactId,
  shares,
  tenantId,
}: {
  artifactId: ArtifactId
  shares: NonNullable<ArtifactDetail["shares"]>
  tenantId: string
}) {
  const revokeShare = useMutation(api.artifacts.console.revokeShare)
  const revoke = () => {
    void revokeShare({ tenantId, artifactId })
      .then(() => toast.success("Share links revoked."))
      .catch((error: unknown) =>
        showErrorToast(error, "Could not revoke the share links.")
      )
  }

  return (
    <div className="absolute top-4 right-4 z-30 flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm shadow-sm">
      <Link2 className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">
        {shares.count === 1 ? "Shared" : `${shares.count} share links`} until{" "}
        {absoluteTime(shares.latestExpiresAt)}
      </span>
      <Button onClick={revoke} size="sm" type="button" variant="ghost">
        {shares.count === 1 ? "Revoke" : "Revoke all"}
      </Button>
    </div>
  )
}

function ArtifactFullscreenShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh flex-col bg-background">
      <ArtifactBackButton />
      {children}
    </main>
  )
}

function ArtifactBackButton() {
  return (
    <div className="group/back absolute top-4 left-0 z-30 h-12 w-28">
      <Button
        asChild
        className="gap-0 overflow-hidden rounded-l-none rounded-r-md px-1 opacity-80 shadow-sm transition-[gap,opacity] duration-150 ease-out group-focus-within/back:gap-1 group-focus-within/back:opacity-100 group-hover/back:gap-1 group-hover/back:opacity-100"
        size="sm"
        variant="secondary"
      >
        <Link to="/artifacts">
          <ArrowLeft />
          <span className="inline-block max-w-0 overflow-hidden opacity-0 transition-[max-width,opacity] duration-150 ease-out group-focus-within/back:max-w-10 group-focus-within/back:opacity-100 group-hover/back:max-w-10 group-hover/back:opacity-100">
            Back
          </span>
        </Link>
      </Button>
    </div>
  )
}
