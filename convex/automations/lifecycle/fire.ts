import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { checkRunBudget } from "../../billing/guard"
import { getTimeTriggerAt } from "../timing"
import { hasInactiveParent } from "./children"
import { createAutomationRun } from "./run"
import { scheduleNextCronAutomation } from "./trigger"

export async function fireAutomation(
  ctx: MutationCtx,
  args: {
    automationId: Id<"automations">
    expectedAt: number
  }
): Promise<{ runId: Id<"runs"> } | null> {
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

  if (await hasInactiveParent(ctx, automation)) {
    await ctx.db.delete(automation._id)
    return null
  }

  // A blocked budget drops this cycle's run but still advances the schedule,
  // so a paused organization resumes cleanly instead of replaying a backlog.
  const budget = await checkRunBudget(ctx, {
    tenantId: automation.tenantId,
    interactive: false,
  })

  if (automation.type === "once") {
    const runId = budget.ok
      ? await createAutomationRun(ctx, {
          automation,
          cause: {
            type: "time",
            scheduledAt: args.expectedAt,
          },
          now,
        })
      : null

    if (automation.parentId === undefined) {
      await ctx.db.patch(automation._id, {
        status: "completed",
        trigger: {
          ...automation.trigger,
          functionId: undefined,
        },
        updatedAt: now,
      })
    } else {
      await ctx.db.delete(automation._id)
    }

    return runId === null ? null : { runId }
  }

  const trigger = await scheduleNextCronAutomation(ctx, automation, now)
  const runId = budget.ok
    ? await createAutomationRun(ctx, {
        automation: { ...automation, trigger },
        cause: {
          type: "time",
          scheduledAt: args.expectedAt,
        },
        now,
      })
    : null

  await ctx.db.patch(automation._id, {
    trigger,
    updatedAt: now,
  })

  return runId === null ? null : { runId }
}

export async function startEventAutomations(
  ctx: MutationCtx,
  args: {
    event: Doc<"events">
    now: number
  }
) {
  const budget = await checkRunBudget(ctx, {
    tenantId: args.event.tenantId,
    interactive: false,
  })

  if (!budget.ok) {
    return []
  }

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

  const triggerMatch = trigger.match

  if (triggerMatch === undefined) {
    return true
  }

  const eventMatch = event.match

  if (eventMatch === undefined) {
    return false
  }

  return Object.entries(triggerMatch).every(
    ([key, value]) => eventMatch[key] === value
  )
}
