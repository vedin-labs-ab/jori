import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { scheduleOutput } from "../schemas/schedules"
import {
  compareSchedules,
  getRequiredSchedule,
  getTenantSchedule,
  matchesQuery,
} from "./data"
import {
  getScheduleTiming,
  normalizeRequiredText,
  requiredCron,
  scheduleInput,
} from "./timing"

const maxSearchResults = 100

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    name: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
    output: scheduleOutput,
    schedule: scheduleInput,
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const timing = getScheduleTiming(args.schedule, now)
    const scheduleId = await ctx.db.insert("schedules", {
      tenantId: args.tenantId,
      name: normalizeRequiredText(args.name, "name"),
      description: normalizeRequiredText(args.description, "description"),
      metadata: args.metadata,
      output: args.output,
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
  },
})

export const search = internalQuery({
  args: {
    tenantId: v.string(),
    query: v.optional(v.string()),
    includeCompleted: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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
  },
})

export const read = internalQuery({
  args: {
    tenantId: v.string(),
    scheduleId: v.id("schedules"),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.scheduleId)

    if (schedule === null || schedule.tenantId !== args.tenantId) {
      return null
    }

    return schedule
  },
})

export const update = internalMutation({
  args: {
    tenantId: v.string(),
    scheduleId: v.id("schedules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    output: v.optional(scheduleOutput),
    schedule: v.optional(scheduleInput),
  },
  handler: async (ctx, args) => {
    const existing = await getTenantSchedule(
      ctx,
      args.tenantId,
      args.scheduleId
    )
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
      patch.output = args.output
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
  },
})

export const remove = internalMutation({
  args: {
    tenantId: v.string(),
    scheduleId: v.id("schedules"),
  },
  handler: async (ctx, args) => {
    const schedule = await getTenantSchedule(
      ctx,
      args.tenantId,
      args.scheduleId
    )

    if (schedule.scheduledFunctionId !== undefined) {
      await ctx.scheduler.cancel(schedule.scheduledFunctionId)
    }

    await ctx.db.delete(args.scheduleId)

    return { deleted: true, scheduleId: args.scheduleId }
  },
})

export const fire = internalMutation({
  args: {
    scheduleId: v.id("schedules"),
    expectedRunAt: v.number(),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.scheduleId)
    const now = Date.now()

    if (
      schedule === null ||
      schedule.status !== "active" ||
      schedule.nextRunAt !== args.expectedRunAt
    ) {
      return null
    }

    const triggerId = await ctx.db.insert("triggers", {
      tenantId: schedule.tenantId,
      scheduleId: schedule._id,
      type: "scheduled",
      data: {
        scheduleName: schedule.name,
      },
      createdBy: schedule.createdBy,
      createdAt: now,
    })

    const executionId = await ctx.db.insert("executions", {
      tenantId: schedule.tenantId,
      triggerId,
      status: "queued",
      createdBy: schedule.createdBy,
      createdAt: now,
    })

    await ctx.scheduler.runAfter(
      0,
      internal.runs.runtime.runScheduledExecution,
      {
        executionId,
      }
    )

    if (schedule.type === "oneShot") {
      await ctx.db.patch(schedule._id, {
        status: "completed",
        scheduledFunctionId: undefined,
        nextRunAt: undefined,
        lastTriggeredAt: now,
        updatedAt: now,
      })
    } else {
      const nextRunAt = getScheduleTiming(
        { type: "recurring", cron: requiredCron(schedule) },
        now
      ).nextRunAt
      const scheduledFunctionId = await scheduleNextRun(ctx, {
        scheduleId: schedule._id,
        runAt: nextRunAt,
      })
      await ctx.db.patch(schedule._id, {
        nextRunAt,
        scheduledFunctionId,
        lastTriggeredAt: now,
        updatedAt: now,
      })
    }

    return { executionId, triggerId }
  },
})

async function scheduleNextRun(
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
