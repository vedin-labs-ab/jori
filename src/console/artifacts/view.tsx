import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import { type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { FullscreenSkeletonLoader } from "../loading"
import { ConsolePage } from "../page"
import { ArtifactFrame } from "./frame"
import { type ArtifactDetail } from "./types"

type ArtifactId = ArtifactDetail["artifactId"]

export function ArtifactView({ artifactId }: { artifactId: ArtifactId }) {
  return (
    <ConsolePage chrome="none" loadingFallback={<ArtifactViewLoading />}>
      {(organization) => (
        <ArtifactViewContent
          artifactId={artifactId}
          tenantId={organization.id}
        />
      )}
    </ConsolePage>
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
  return (
    <ArtifactFullscreenShell>
      <ArtifactFrame
        artifact={artifact}
        tenantId={tenantId}
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
