import { createFileRoute } from "@tanstack/react-router"
import { type GenericId } from "convex/values"
import { JobView } from "@/console/jobs/detail"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

export const Route = createFileRoute("/_workspace/jobs/$jobId/")({
  component: JobRoute,
  // The job's own name takes over once it has loaded.
  head: ({ params }) => ({
    meta: [{ title: consoleDocumentTitle(`/jobs/${params.jobId}`) }],
  }),
})

function JobRoute() {
  const { jobId } = Route.useParams()

  return <JobView jobId={jobId as GenericId<"jobs">} />
}
