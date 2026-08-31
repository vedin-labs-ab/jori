import { createFileRoute } from "@tanstack/react-router"
import { MaterialSection } from "@/console/frame"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/files")({
  component: MaterialSection,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/files") }] }),
})
