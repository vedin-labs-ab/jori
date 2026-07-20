import { useConvexAuth } from "convex/react"
import { type GenericId } from "convex/values"
import { lazy, Suspense } from "react"
import { ArtifactShareView } from "@/shared/artifacts/share"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { authClient } from "@/shared/session/auth"

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
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth()
  const { data: organization, isPending: isOrganizationPending } =
    authClient.useActiveOrganization()
  const isSignedIn = session !== null && session !== undefined
  const loading = <FullscreenSkeletonLoader aria-label="Loading artifact" />

  if (isSessionPending) {
    return loading
  }

  if (secret !== null && !isSignedIn) {
    return <ArtifactShareView artifactId={artifactId} secret={secret} />
  }

  if (
    secret !== null &&
    (isConvexLoading || (isSignedIn && isOrganizationPending))
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
