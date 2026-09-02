import { createFileRoute } from "@tanstack/react-router"
import { Jobs } from "@/console/jobs"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/jobs")({
  component: Jobs,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/jobs") }] }),
})
