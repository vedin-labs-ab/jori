import { createFileRoute } from "@tanstack/react-router"
import { MaterialSection } from "@/console/frame"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/tables")({
  component: MaterialSection,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/tables") }] }),
})
