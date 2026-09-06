import { createFileRoute } from "@tanstack/react-router"
import { ChatSection } from "@/console/chat"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/chat")({
  component: ChatSection,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/chat") }] }),
})
