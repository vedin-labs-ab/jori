import { createFileRoute } from "@tanstack/react-router"
import { ChatHomePage } from "@/console/chat/home"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/chat/")({
  component: ChatHomePage,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/chat") }] }),
})
