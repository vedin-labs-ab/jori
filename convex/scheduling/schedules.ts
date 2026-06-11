import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalMutation, internalQuery } from "../_generated/server"
import {
  createSchedule,
  removeSchedule,
  scheduleNextRun,
  searchSchedules,
  updateSchedule,
} from "./data"
import { scheduleOutput } from "./schema"
import { getScheduleTiming, requiredCron, scheduleInput } from "./timing"

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
  handler: async (ctx, args) => await createSchedule(ctx, args),
})

export const search = internalQuery({
  args: {
    tenantId: v.string(),
    query: v.optional(v.string()),
    includeCompleted: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => await searchSchedules(ctx, args),
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
  handler: async (ctx, args) => await updateSchedule(ctx, args),
})

export const remove = internalMutation({
  args: {
    tenantId: v.string(),
    scheduleId: v.id("schedules"),
  },
  handler: async (ctx, args) => await removeSchedule(ctx, args),
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

    await ctx.scheduler.runAfter(
      0,
      internal.executions.runtime.runScheduledExecution,
      {
        triggerId,
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

    return { triggerId }
  },
})
