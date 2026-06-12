import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { normalizeScheduleOutput, type ScheduleOutput } from "./output"
import {
  getScheduleTiming,
  normalizeRequiredText,
  type ScheduleInput,
} from "./timing"

export const maxSearchResults = 100

export async function createSchedule(
  ctx: MutationCtx,
  args: {
    tenantId: string
    name: string
    description: string
    metadata?: unknown
    output: ScheduleOutput
    schedule: ScheduleInput
    createdBy?: string
  }
) {
  const now = Date.now()
  const timing = getScheduleTiming(args.schedule, now)
  const scheduleId = await ctx.db.insert("schedules", {
    tenantId: args.tenantId,
    name: normalizeRequiredText(args.name, "name"),
    description: normalizeRequiredText(args.description, "description"),
    metadata: args.metadata,
    output: normalizeScheduleOutput(args.output),
    type: args.schedule.type,
    cron: timing.cron,
    runAt: timing.runAt,
    nextRunAt: timing.nextRunAt,
    status: "active",
    createdBy: args.createdBy,
    createdAt: now,
    updatedAt: now,
  })

  const scheduledFunctionId = await scheduleNextRun(ctx, {
    scheduleId,
    runAt: timing.nextRunAt,
  })
  await ctx.db.patch(scheduleId, { scheduledFunctionId })

  return await getRequiredSchedule(ctx, scheduleId)
}

export async function searchSchedules(
  ctx: QueryCtx,
  args: {
    tenantId: string
    query?: string
    includeCompleted?: boolean
    limit?: number
  }
) {
  const limit = Math.min(args.limit ?? 25, maxSearchResults)
  const query = args.query?.trim().toLowerCase()
  const schedules =
    args.includeCompleted === true
      ? await ctx.db
          .query("schedules")
          .withIndex("by_tenant", (index) =>
            index.eq("tenantId", args.tenantId)
          )
          .collect()
      : await ctx.db
          .query("schedules")
          .withIndex("by_tenant_status", (index) =>
            index.eq("tenantId", args.tenantId).eq("status", "active")
          )
          .collect()

  return schedules
    .filter((schedule) => matchesQuery(schedule, query))
    .sort((left, right) => compareSchedules(left, right))
    .slice(0, limit)
}

export async function updateSchedule(
  ctx: MutationCtx,
  args: {
    tenantId: string
    scheduleId: Id<"schedules">
    name?: string
    description?: string
    metadata?: unknown
    output?: ScheduleOutput
    schedule?: ScheduleInput
  }
) {
  const existing = await getTenantSchedule(ctx, args.tenantId, args.scheduleId)
  const now = Date.now()
  const patch: Partial<Doc<"schedules">> = { updatedAt: now }

  if (args.name !== undefined) {
    patch.name = normalizeRequiredText(args.name, "name")
  }

  if (args.description !== undefined) {
    patch.description = normalizeRequiredText(args.description, "description")
  }

  if (Object.hasOwn(args, "metadata")) {
    patch.metadata = args.metadata ?? undefined
  }

  if (args.output !== undefined) {
    patch.output = normalizeScheduleOutput(args.output)
  }

  if (args.schedule !== undefined) {
    if (existing.scheduledFunctionId !== undefined) {
      await ctx.scheduler.cancel(existing.scheduledFunctionId)
    }

    const timing = getScheduleTiming(args.schedule, now)
    patch.type = args.schedule.type
    patch.cron = timing.cron
    patch.runAt = timing.runAt
    patch.nextRunAt = timing.nextRunAt
    patch.status = "active"
    patch.scheduledFunctionId = await scheduleNextRun(ctx, {
      scheduleId: args.scheduleId,
      runAt: timing.nextRunAt,
    })
  }

  await ctx.db.patch(args.scheduleId, patch)

  return await getRequiredSchedule(ctx, args.scheduleId)
}

export async function removeSchedule(
  ctx: MutationCtx,
  args: {
    tenantId: string
    scheduleId: Id<"schedules">
  }
) {
  const schedule = await getTenantSchedule(ctx, args.tenantId, args.scheduleId)

  if (schedule.scheduledFunctionId !== undefined) {
    await ctx.scheduler.cancel(schedule.scheduledFunctionId)
  }

  await ctx.db.delete(args.scheduleId)

  return { deleted: true, scheduleId: args.scheduleId }
}

export async function scheduleNextRun(
  ctx: MutationCtx,
  args: {
    scheduleId: Id<"schedules">
    runAt: number
  }
) {
  return await ctx.scheduler.runAt(
    args.runAt,
    internal.scheduling.schedules.fire,
    {
      scheduleId: args.scheduleId,
      expectedRunAt: args.runAt,
    }
  )
}

export async function getTenantSchedule(
  ctx: MutationCtx,
  tenantId: string,
  scheduleId: Id<"schedules">
) {
  const schedule = await ctx.db.get(scheduleId)

  if (schedule === null || schedule.tenantId !== tenantId) {
    throw new Error("Schedule not found.")
  }

  return schedule
}

export async function getRequiredSchedule(
  ctx: MutationCtx,
  scheduleId: Id<"schedules">
) {
  const schedule = await ctx.db.get(scheduleId)

  if (schedule === null) {
    throw new Error("Schedule not found.")
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
