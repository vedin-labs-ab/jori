import { isWebTool } from "@contracts/permissions/web"
import { ToolAccessSummary } from "@/shared/console/tools/summary"
import { type Job } from "../types"

export function JobToolSummary({ job }: { job: Job }) {
  return (
    <ToolAccessSummary
      surfaces={job.access.surfaces.map((surface) => surface.integration)}
      toolCount={countTools(job)}
      webSearch={job.access.surfaces.some((surface) =>
        surface.tools.some(isWebTool)
      )}
    />
  )
}

function countTools(job: Job) {
  return job.access.surfaces.reduce(
    (sum, surface) => sum + surface.tools.length,
    0
  )
}
