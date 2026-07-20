import { type GenericId } from "convex/values"
import { lazy, Suspense } from "react"
import { ArtifactShareView } from "@/shared/artifacts/share"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import {
  useActiveOrganization,
  useConvexSession,
  useSession,
} from "@/shared/session/auth"

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
  const session = useSession()
  const convex = useConvexSession()
  const organization = useActiveOrganization()
  const isSignedIn = session.data !== null && session.data !== undefined
  const loading = <FullscreenSkeletonLoader aria-label="Loading artifact" />

  if (session.isPending) {
    return loading
  }

  if (secret !== null && !isSignedIn) {
    return <ArtifactShareView artifactId={artifactId} secret={secret} />
  }

  if (
    secret !== null &&
    (convex.isLoading || (isSignedIn && organization.isPending))
  ) {
    return loading
  }

  const shareFallback =
    secret === null ? undefined : (
      <ArtifactShareView artifactId={artifactId} secret={secret} />
    )

  if (
    shareFallback !== undefined &&
    (!convex.isAuthenticated ||
      organization.data === null ||
      organization.data === undefined)
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
