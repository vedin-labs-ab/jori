import { createFileRoute } from "@tanstack/react-router"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { SessionProviders } from "@/shared/session"
import { useShareSecret } from "@/shared/share/link"
import { StoreAccess } from "./-view/access"

export const Route = createFileRoute("/stores/$storeId/")({
  component: StoreRoute,
  /**
   * A share link is meant to be handed to someone, not found. robots.txt
   * keeps well-behaved crawlers off the path; this keeps the page out of an
   * index even when one arrives by a link somebody pasted somewhere public.
   *
   * The title stays generic on purpose: what the store is called is a fact
   * the secret buys, and the head is rendered before anyone has spent it.
   */
  head: () => ({
    meta: [
      { title: "Store · Jori" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
})

function StoreRoute() {
  const { storeId } = Route.useParams()
  const secret = useShareSecret()

  if (secret === undefined) {
    return <FullscreenSkeletonLoader aria-label="Loading store" />
  }

  return (
    <SessionProviders>
      <StoreAccess secret={secret} storeId={storeId} />
    </SessionProviders>
  )
}
