import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { getTimeTriggerAt } from "../schedule/timing"
import { createAutomationRun } from "./run"
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
    automation.type === "event" ||
    !("nextAt" in automation.trigger || "at" in automation.trigger) ||
    getTimeTriggerAt(automation.trigger) !== args.expectedAt
  ) {
    return null
  }

  if (automation.type === "once") {
    const runId = await createAutomationRun(ctx, {
      automation,
      cause: {
        type: "time",
        scheduledAt: args.expectedAt,
      },
      now,
    })

    await ctx.db.patch(automation._id, {
      status: "completed",
      trigger: {
        ...automation.trigger,
        functionId: undefined,
      },
      firedAt: now,
      updatedAt: now,
    })

    return { runId }
  }

  const trigger = await scheduleNextCronAutomation(ctx, automation, now)
  const runId = await createAutomationRun(ctx, {
    automation: { ...automation, trigger },
    cause: {
      type: "time",
      scheduledAt: args.expectedAt,
    },
    now,
  })

  await ctx.db.patch(automation._id, {
    trigger,
    firedAt: now,
    updatedAt: now,
  })

  return { runId }
}

export async function startEventAutomations(
  ctx: MutationCtx,
  args: {
    event: Doc<"events">
    now: number
  }
) {
  const integration = await ctx.db.get(args.event.integrationId)
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
        event: args.event,
        integration,
        cause: {
          type: "event",
          eventId: args.event._id,
        },
        now: args.now,
      })
    )
    await ctx.db.patch(automation._id, {
      firedAt: args.now,
      updatedAt: args.now,
    })
  }

  return runIds
}

export function matchesEvent(
  automation: Doc<"automations">,
  event: Doc<"events">
) {
  const trigger = automation.trigger

  if (
    automation.type !== "event" ||
    !("integrationId" in trigger) ||
    trigger.integrationId !== event.integrationId ||
    trigger.event !== event.type
  ) {
    return false
  }

  const triggerCriteria = trigger.criteria ?? legacyTriggerCriteria(trigger)

  if (triggerCriteria === undefined) {
    return true
  }

  const eventCriteria = event.criteria ?? legacyEventCriteria(event)

  if (eventCriteria === undefined) {
    return false
  }

  return Object.entries(triggerCriteria).every(
    ([key, value]) => eventCriteria[key] === value
  )
}

function legacyTriggerCriteria(
  trigger: Extract<Doc<"automations">["trigger"], { integrationId: string }>
): Record<string, string> | undefined {
  return trigger.filter === undefined || trigger.filter === ""
    ? undefined
    : { resource: trigger.filter }
}

function legacyEventCriteria(
  event: Doc<"events">
): Record<string, string> | undefined {
  return event.resource === undefined || event.resource === ""
    ? undefined
    : { resource: event.resource }
}
