import { parseShareFragment } from "@contracts/apps/share"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { SessionProviders } from "@/shared/session"
import { AppAccess } from "./-view/access"

export const Route = createFileRoute("/apps/$appId/")({
  component: AppRoute,
  /**
   * A share link is meant to be handed to someone, not found. robots.txt keeps
   * well-behaved crawlers off the path; this keeps the page out of an index
   * even when one arrives by a link somebody pasted somewhere public.
   *
   * The title stays generic on purpose: what the app is called is a fact the
   * secret buys, and the head is rendered before anyone has spent it.
   */
  head: () => ({
    meta: [
      { title: "App · Jori" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
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
