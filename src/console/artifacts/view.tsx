import { Link } from "@tanstack/react-router"
import { useAction, useQuery } from "convex/react"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import { type ReactNode, useCallback } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SessionProviders } from "@/shared/providers"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { FullscreenSkeletonLoader } from "../shared/loading"
import { ArtifactFrame } from "./frame"
import { ArtifactLinks } from "./links"
import { ArtifactRailLabel, artifactRailButtonClassName } from "./rail"
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
      <ArtifactLinks artifactId={artifact.artifactId} tenantId={tenantId} />
      <ArtifactFrame
        artifactId={artifact.artifactId}
        mintSession={mintSession}
        title={artifact.title}
        variant="fullscreen"
      />
    </ArtifactFullscreenShell>
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
    <div className="group/action absolute top-4 left-0 z-30 w-28">
      <Button
        asChild
        className={artifactRailButtonClassName}
        size="sm"
        variant="secondary"
      >
        <Link to="/artifacts">
          <ArrowLeft />
          <ArtifactRailLabel>Back</ArtifactRailLabel>
        </Link>
      </Button>
    </div>
  )
}
