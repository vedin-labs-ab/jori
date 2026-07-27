import { createFileRoute } from "@tanstack/react-router"
import { Automations } from "@/console/automations"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/automations")({
  component: Automations,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/automations") }] }),
})
