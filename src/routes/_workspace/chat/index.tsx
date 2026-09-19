import { type MessageContext } from "@contracts/replies/answers"
import { createFileRoute, type SearchSchemaInput } from "@tanstack/react-router"
import { billingSearch } from "@/console/billing/return"
import { ChatHomePage } from "@/console/chat/home"
import { parseContextSearch } from "@/shared/console/chat/pane/context"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

// `context` names the resource or folder the chat is opened about, as
// `<kind>:<id>`; a link spells it that way, and the page reads it as a
// `MessageContext`. Anything else drops out of the search.
export const Route = createFileRoute("/_workspace/chat/")({
  validateSearch: (
    search: { context?: string; billing?: string } & SearchSchemaInput
  ): { context?: MessageContext } & ReturnType<typeof billingSearch> => {
    const context = parseContextSearch(search.context)

    return {
      ...billingSearch(search),
      ...(context === undefined ? {} : { context }),
    }
  },
  component: ChatHomeRoute,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/chat") }] }),
})

function ChatHomeRoute() {
  const { context } = Route.useSearch()

  return <ChatHomePage context={context} />
}
