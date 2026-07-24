import { parseShareFragment } from "@contracts/apps/share"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { SessionProviders } from "@/shared/session"
import { AppAccess } from "./-view/access"

export const Route = createFileRoute("/apps/$appId/")({
  component: AppRoute,
})

function AppRoute() {
  const { appId } = Route.useParams()
  const secret = useShareSecret()

  if (secret === undefined) {
    return <FullscreenSkeletonLoader aria-label="Loading app" />
  }

  return (
    <SessionProviders>
      <AppAccess appId={appId} secret={secret} />
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
