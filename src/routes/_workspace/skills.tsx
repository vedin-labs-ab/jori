import { createFileRoute } from "@tanstack/react-router"
import { Skills } from "@/console/skills"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/_workspace/skills")({
  component: Skills,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/skills") }] }),
})
