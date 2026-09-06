import { createFileRoute } from "@tanstack/react-router"
import { type GenericId } from "convex/values"
import { ConversationPage } from "@/console/chat/thread"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/chat/$conversationId/")({
  component: ConversationRoute,
  // The conversation's own title takes over once it has loaded.
  head: ({ params }) => ({
    meta: [{ title: consoleDocumentTitle(`/chat/${params.conversationId}`) }],
  }),
})

function ConversationRoute() {
  const { conversationId } = Route.useParams()

  return (
    <ConversationPage
      conversationId={conversationId as GenericId<"conversations">}
    />
  )
}
