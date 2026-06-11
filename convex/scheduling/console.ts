import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { mutation, query } from "../_generated/server"
import { requireClerkUserId } from "../identity/users"
import { checkTenantAccess, requireTenantAccess } from "../skills/access"
import {
  createSchedule,
  maxSearchResults,
  removeSchedule,
  searchSchedules,
  updateSchedule,
} from "./data"
import { scheduleOutput } from "./schema"
import { scheduleInput } from "./timing"

export const list = query({
  args: {
    tenantId: v.string(),
    query: v.string(),
    includeCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        schedules: [],
      }
    }

    const schedules = await searchSchedules(ctx, {
      tenantId: args.tenantId,
      query: args.query,
      includeCompleted: args.includeCompleted,
      limit: maxSearchResults,
    })

    return {
      status: "ready" as const,
      schedules: schedules.map(toConsoleSchedule),
    }
  },
})

export const create = mutation({
  args: {
    tenantId: v.string(),
    name: v.string(),
    description: v.string(),
    output: scheduleOutput,
    schedule: scheduleInput,
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const schedule = await createSchedule(ctx, {
      ...args,
      createdBy: requireClerkUserId(identity),
    })

    return toConsoleSchedule(schedule)
  },
})

export const update = mutation({
  args: {
    tenantId: v.string(),
    scheduleId: v.id("schedules"),
    name: v.string(),
    description: v.string(),
    output: scheduleOutput,
    schedule: v.optional(scheduleInput),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    return toConsoleSchedule(await updateSchedule(ctx, args))
  },
})

export const remove = mutation({
  args: {
    tenantId: v.string(),
    scheduleId: v.id("schedules"),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    await removeSchedule(ctx, args)

    return null
  },
})

function toConsoleSchedule(schedule: Doc<"schedules">) {
  return {
    id: schedule._id,
    name: schedule.name,
    description: schedule.description,
    type: schedule.type,
    status: schedule.status,
    cron: schedule.cron,
    runAt: schedule.runAt,
    nextRunAt: schedule.nextRunAt,
    lastTriggeredAt: schedule.lastTriggeredAt,
    output: schedule.output,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  }
}
