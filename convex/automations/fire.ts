import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createAutomationRun } from "./run"
import { getTimeTriggerAt } from "./timing"
import { scheduleNextCronAutomation } from "./trigger"

export async function fireAutomation(
  ctx: MutationCtx,
  args: {
    automationId: Id<"automations">
    expectedAt: number
  }
) {
  const automation = await ctx.db.get(args.automationId)
  const now = Date.now()

  if (
    automation === null ||
    automation.status !== "active" ||
    automation.trigger.type === "event" ||
    getTimeTriggerAt(automation.trigger) !== args.expectedAt
  ) {
    return null
  }

  const runId = await createAutomationRun(ctx, {
    automation,
    reason: {
      type: "time",
      scheduledAt: args.expectedAt,
    },
    now,
  })

  if (automation.trigger.type === "once") {
    await ctx.db.patch(automation._id, {
      status: "completed",
      trigger: {
        ...automation.trigger,
        functionId: undefined,
      },
      lastRunAt: now,
      updatedAt: now,
    })
  } else {
    await ctx.db.patch(automation._id, {
      trigger: await scheduleNextCronAutomation(ctx, automation, now),
      lastRunAt: now,
      updatedAt: now,
    })
  }

  return { runId }
}

export async function startEventAutomations(
  ctx: MutationCtx,
  args: {
    event: Doc<"events">
    now: number
  }
) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_tenant_status", (index) =>
      index.eq("tenantId", args.event.tenantId).eq("status", "active")
    )
    .collect()
  const runIds: Id<"runs">[] = []

  for (const automation of automations) {
    if (!matchesEvent(automation, args.event)) {
      continue
    }

    runIds.push(
      await createAutomationRun(ctx, {
        automation,
        reason: {
          type: "event",
          eventId: args.event._id,
        },
        now: args.now,
      })
    )
    await ctx.db.patch(automation._id, {
      lastRunAt: args.now,
      updatedAt: args.now,
    })
  }

  return runIds
}

function matchesEvent(automation: Doc<"automations">, event: Doc<"events">) {
  const trigger = automation.trigger

  if (
    trigger.type !== "event" ||
    trigger.integrationId !== event.integrationId ||
    trigger.event !== event.type
  ) {
    return false
  }

  if (trigger.filter === undefined || trigger.filter === "") {
    return true
  }

  return event.resource === trigger.filter
}
