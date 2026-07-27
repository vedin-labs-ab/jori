import { createFileRoute } from "@tanstack/react-router"
import { Console } from "@/console"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/console")({
  component: Console,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/console") }] }),
})
