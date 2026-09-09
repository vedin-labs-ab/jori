import { createFileRoute } from "@tanstack/react-router"
import { Jobs } from "@/console/jobs"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/_workspace/jobs/")({
  component: Jobs,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/jobs") }] }),
})
