import { Link } from "@tanstack/react-router"
import { useAction, useQuery } from "convex/react"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import { type ReactNode, useCallback, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ArtifactFrame } from "@/shared/artifacts/frame"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { api } from "../../../../convex/_generated/api"
import { ConsolePage } from "../../page"
import { type ArtifactDetail } from "../types"
import { memberArtifactUrl } from "./fragment"
import { ArtifactLinks } from "./links"
import { ArtifactRailLabel, artifactRailButtonClassName } from "./rail"

type ArtifactId = ArtifactDetail["artifactId"]

export function ArtifactView({
  artifactId,
  fallback,
}: {
  artifactId: ArtifactId
  fallback?: ReactNode
}) {
  return (
    <ConsolePage chrome="none" loadingFallback={<ArtifactViewLoading />}>
      {(organizationId) => (
        <ArtifactViewContent
          artifactId={artifactId}
          fallback={fallback}
          organizationId={organizationId}
        />
      )}
    </ConsolePage>
  )
}

function ArtifactViewContent({
  artifactId,
  fallback,
  organizationId,
}: {
  artifactId: ArtifactId
  fallback: ReactNode | undefined
  organizationId: string
}) {
  const artifactResult = useQuery(api.artifacts.console.get, {
    organizationId,
    artifactId,
  })

  if (artifactResult === undefined) {
    return <ArtifactViewLoading />
  }

  if (artifactResult.status === "unauthorized") {
    if (fallback !== undefined) {
      return fallback
    }

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
    if (fallback !== undefined) {
      return fallback
    }

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
      organizationId={organizationId}
    />
  )
}

function ArtifactViewLoading() {
  return <FullscreenSkeletonLoader aria-label="Loading artifact" />
}

function PublishedArtifactView({
  artifact,
  organizationId,
}: {
  artifact: ArtifactDetail
  organizationId: string
}) {
  useMemberArtifactUrl()
  const createSession = useAction(api.artifacts.actions.createSession)
  const mintSession = useCallback(
    () => createSession({ organizationId, artifactId: artifact.artifactId }),
    [artifact.artifactId, createSession, organizationId]
  )

  return (
    <ArtifactFullscreenShell>
      <ArtifactLinks
        artifactId={artifact.artifactId}
        organizationId={organizationId}
      />
      <ArtifactFrame
        artifactId={artifact.artifactId}
        mintSession={mintSession}
        title={artifact.title}
        variant="fullscreen"
      />
    </ArtifactFullscreenShell>
  )
}

function useMemberArtifactUrl() {
  useEffect(() => {
    const url = memberArtifactUrl(window.location)

    if (url !== null) {
      window.history.replaceState(window.history.state, "", url)
    }
  }, [])
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
