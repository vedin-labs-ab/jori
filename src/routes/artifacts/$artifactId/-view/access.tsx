import { useAuth, useOrganization } from "@clerk/tanstack-react-start"
import { useConvexAuth } from "convex/react"
import { type GenericId } from "convex/values"
import { lazy, Suspense } from "react"
import { ArtifactShareView } from "@/shared/artifacts/share"
import { FullscreenSkeletonLoader } from "@/shared/loading"

/** Lazy so anonymous share-link visitors do not download the member console
 *  graph after the session check establishes that there is no member. */
const ArtifactView = lazy(() =>
  import("@/console/artifacts/view").then((module) => ({
    default: module.ArtifactView,
  }))
)

export function ArtifactAccess({
  artifactId,
  secret,
}: {
  artifactId: string
  secret: string | null
}) {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth()
  const { isLoaded: isOrganizationLoaded, organization } = useOrganization()
  const loading = <FullscreenSkeletonLoader aria-label="Loading artifact" />

  if (!isAuthLoaded) {
    return loading
  }

  if (secret !== null && !isSignedIn) {
    return <ArtifactShareView artifactId={artifactId} secret={secret} />
  }

  if (
    secret !== null &&
    (isConvexLoading || (isSignedIn && !isOrganizationLoaded))
  ) {
    return loading
  }

  const shareFallback =
    secret === null ? undefined : (
      <ArtifactShareView artifactId={artifactId} secret={secret} />
    )

  if (
    shareFallback !== undefined &&
    (!isAuthenticated || organization === null || organization === undefined)
  ) {
    return shareFallback
  }

  return (
    <Suspense fallback={loading}>
      <ArtifactView
        artifactId={artifactId as GenericId<"artifacts">}
        fallback={shareFallback}
      />
    </Suspense>
  )
}
