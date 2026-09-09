import { createFileRoute } from "@tanstack/react-router"
import { FileAccess } from "./-view/access"

export const Route = createFileRoute("/_workspace/files/$fileId/")({
  component: FileRoute,
  /**
   * A share link is meant to be handed to someone, not found. robots.txt
   * keeps well-behaved crawlers off the path; this keeps the page out of an
   * index even when one arrives by a link somebody pasted somewhere public.
   *
   * The title stays generic on purpose: what the file is called is a fact
   * the secret buys, and the head is rendered before anyone has spent it.
   */
  head: () => ({
    meta: [
      { title: "File · Jori" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
})

function FileRoute() {
  const { fileId } = Route.useParams()

  return <FileAccess fileId={fileId} />
}
