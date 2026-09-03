import { toolSurfaceLabel } from "@contracts/integrations"
import { type ToolGroup } from "../../tools/groups"
import { toolCapability } from "../../tools/model"
import { type Job } from "../types"

/** The job's access as the run detail lists a run's: one group per
 *  integration, each tool described off the catalog. */
export function jobToolGroups(job: Job): ToolGroup[] {
  return job.access.surfaces.map((surface) => ({
    type: surface.integration,
    label: toolSurfaceLabel(surface.integration),
    tools: surface.tools.map(toolCapability),
  }))
}
