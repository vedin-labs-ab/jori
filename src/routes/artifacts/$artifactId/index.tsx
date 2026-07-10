import { parseShareFragment } from "@contracts/artifacts/share"
import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense, useEffect, useState } from "react"
import { ArtifactShareView } from "@/console/artifacts/share"
import { type ArtifactDetail } from "@/console/artifacts/types"
import { FullscreenSkeletonLoader } from "@/console/shared/loading"

/** Lazy so share-link visitors never download the member view and its
 *  console/session graph. */
const ArtifactView = lazy(() =>
  import("@/console/artifacts/view").then((module) => ({
    default: module.ArtifactView,
  }))
)

export const Route = createFileRoute("/artifacts/$artifactId/")({
  component: ArtifactRoute,
})

function ArtifactRoute() {
  const { artifactId } = Route.useParams()
  const secret = useShareSecret()

  if (secret === undefined) {
    return <FullscreenSkeletonLoader aria-label="Loading artifact" />
  }

  if (secret !== null) {
    return <ArtifactShareView artifactId={artifactId} secret={secret} />
  }

  return (
    <Suspense
      fallback={<FullscreenSkeletonLoader aria-label="Loading artifact" />}
    >
      <ArtifactView artifactId={artifactId as ArtifactDetail["artifactId"]} />
    </Suspense>
  )
}

/** Fragments only exist client-side, so resolve after mount: undefined while
 *  deciding, null for the member view, or the share secret. */
function useShareSecret() {
  const [secret, setSecret] = useState<string | null>()

  useEffect(() => {
    setSecret(parseShareFragment(window.location.hash))
  }, [])

  return secret
}
