import { createFileRoute } from "@tanstack/react-router"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { SessionProviders } from "@/shared/session"
import { useShareSecret } from "@/shared/share/link"
import { TableAccess } from "./-view/access"

export const Route = createFileRoute("/tables/$tableId/")({
  component: TableRoute,
  /**
   * A share link is meant to be handed to someone, not found. robots.txt
   * keeps well-behaved crawlers off the path; this keeps the page out of an
   * index even when one arrives by a link somebody pasted somewhere public.
   *
   * The title stays generic on purpose: what the table is called is a fact
   * the secret buys, and the head is rendered before anyone has spent it.
   */
  head: () => ({
    meta: [
      { title: "Table · Jori" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
})

function TableRoute() {
  const { tableId } = Route.useParams()
  const secret = useShareSecret()

  if (secret === undefined) {
    return <FullscreenSkeletonLoader aria-label="Loading table" />
  }

  return (
    <SessionProviders>
      <TableAccess secret={secret} tableId={tableId} />
    </SessionProviders>
  )
}
