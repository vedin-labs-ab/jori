import { createFileRoute } from "@tanstack/react-router"
import { MaterialSection } from "@/console/frame"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/stores")({
  component: MaterialSection,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/stores") }] }),
})
