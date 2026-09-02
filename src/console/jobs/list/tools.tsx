import { ToolAccessSummary } from "../../shared/tools/summary"
import { type Job } from "../types"

export function JobToolSummary({ job }: { job: Job }) {
  return (
    <ToolAccessSummary
      surfaces={job.access.surfaces.map((surface) => surface.integration)}
      toolCount={countTools(job)}
      webSearch={job.access.webSearch}
    />
  )
}

function countTools(job: Job) {
  return job.access.surfaces.reduce(
    (sum, surface) => sum + surface.tools.length,
    0
  )
}
