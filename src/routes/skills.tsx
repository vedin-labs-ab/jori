import { createFileRoute } from "@tanstack/react-router"
import { consoleDocumentTitle } from "@/console/shell/routes"
import { Skills } from "@/console/skills"

export const Route = createFileRoute("/skills")({
  component: Skills,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/skills") }] }),
})
