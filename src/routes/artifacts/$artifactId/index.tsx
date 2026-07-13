import { parseShareFragment } from "@contracts/artifacts/share"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { ArtifactAccess } from "@/console/artifacts/access"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { SessionProviders } from "@/shared/session"

export const Route = createFileRoute("/artifacts/$artifactId/")({
  component: ArtifactRoute,
})

function ArtifactRoute() {
  const { artifactId } = Route.useParams()
  const secret = useShareSecret()

  if (secret === undefined) {
    return <FullscreenSkeletonLoader aria-label="Loading artifact" />
  }

  return (
    <SessionProviders>
      <ArtifactAccess artifactId={artifactId} secret={secret} />
    </SessionProviders>
  )
}

/** Fragments only exist client-side, so resolve after mount: undefined while
 *  deciding, null for the member view, or the share secret. */
function useShareSecret() {
  const [secret, setSecret] = useState<string | null>()

  useEffect(() => {
    const update = () => setSecret(parseShareFragment(window.location.hash))

    update()
    window.addEventListener("hashchange", update)

    return () => window.removeEventListener("hashchange", update)
  }, [])

  return secret
}
