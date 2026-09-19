import { getNextCronRunAt } from "@contracts/jobs/schedule/cron"
import { getToolPermission } from "@contracts/permissions"
import { type Job } from "@/shared/console/jobs/types"
import { folderId } from "../folders"
import { demoId } from "../ids"
import { ownerFields, personId } from "../people"
import { jobAudience, type StoredVisibility } from "../types"

type JobSurface = Job["access"]["surfaces"][number]

/** Where Copperline's jobs run, so their schedules read in local time. */
export const demoTimezone = "Europe/Stockholm"

export function jobId(name: string) {
  return demoId("jobs", name)
}

/** One integration's share of a job's access, its level read off the
 *  catalog the way the console projects it. */
export function jobSurface(
  integration: JobSurface["integration"],
  tools: string[]
): JobSurface {
  const accesses = new Set(
    tools.map((tool) => getToolPermission(tool)?.access ?? "read")
  )
  const access =
    accesses.has("read") && accesses.has("write")
      ? "both"
      : accesses.has("write")
        ? "write"
        : "read"

  return { integration, access, tools }
}

type JobSpec = {
  key: string
  owner: string
  name: string
  folder: string
  instructions: string
  surfaces: JobSurface[]
  visibility?: StoredVisibility
  status?: Job["status"]
  firedAt: number
  createdAt: number
}

export function cronJob(
  now: number,
  spec: JobSpec & { expression: string }
): Job {
  return {
    ...baseJob(spec),
    type: "cron",
    trigger: {
      expression: spec.expression,
      timezone: demoTimezone,
      nextAt: getNextCronRunAt(spec.expression, now, demoTimezone),
    },
  }
}

export function eventJob(
  spec: JobSpec & { integration: "github" | "linear" }
): Job {
  return {
    ...baseJob(spec),
    type: "event",
    trigger: {
      integration: spec.integration,
      event: "issue.comment.created",
      match: undefined,
    },
  }
}

function baseJob(spec: JobSpec) {
  const visibility = spec.visibility ?? { mode: "organization" as const }

  const ownerId = personId(spec.owner)

  return {
    id: jobId(spec.key),
    ...ownerFields(ownerId),
    key: undefined,
    name: spec.name,
    instructions: spec.instructions,
    audience: jobAudience(visibility),
    visibility,
    status: spec.status ?? ("active" as const),
    folderId: folderId(spec.folder),
    access: { surfaces: spec.surfaces },
    createdAt: spec.createdAt,
    updatedAt: spec.firedAt,
    firedAt: spec.firedAt,
  }
}
