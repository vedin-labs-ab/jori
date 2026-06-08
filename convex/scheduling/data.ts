import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"

export async function getTenantSchedule(
  ctx: MutationCtx,
  tenantId: string,
  scheduleId: Id<"schedules">
) {
  const schedule = await ctx.db.get(scheduleId)

  if (schedule === null || schedule.tenantId !== tenantId) {
    throw new Error("Schedule not found")
  }

  return schedule
}

export async function getRequiredSchedule(
  ctx: MutationCtx,
  scheduleId: Id<"schedules">
) {
  const schedule = await ctx.db.get(scheduleId)

  if (schedule === null) {
    throw new Error("Schedule not found")
  }

  return schedule
}

export function matchesQuery(
  schedule: Doc<"schedules">,
  query: string | undefined
) {
  if (query === undefined || query === "") {
    return true
  }

  return (
    schedule.name.toLowerCase().includes(query) ||
    schedule.description.toLowerCase().includes(query)
  )
}

export function compareSchedules(
  left: Doc<"schedules">,
  right: Doc<"schedules">
) {
  const leftRunAt = left.nextRunAt ?? Number.POSITIVE_INFINITY
  const rightRunAt = right.nextRunAt ?? Number.POSITIVE_INFINITY

  if (leftRunAt !== rightRunAt) {
    return leftRunAt - rightRunAt
  }

  return right.updatedAt - left.updatedAt
}
