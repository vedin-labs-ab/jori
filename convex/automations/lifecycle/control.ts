import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { ensureSubscription, releaseSubscription } from "../subscriptions/data"
import { getRequiredAutomation, getTenantAutomation } from "./read"
import { cancelTrigger, scheduleNextCronAutomation } from "./trigger"

export async function pauseAutomation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    automationId: Id<"automations">
  }
) {
  const automation = await getTenantAutomation(
    ctx,
    args.tenantId,
    args.automationId
  )

  requirePausableAutomation(automation)

  if (automation.status === "paused") {
    return automation
  }

  if (automation.status === "completed") {
    throw new Error("Completed automations cannot be paused.")
  }

  await cancelTrigger(ctx, automation.trigger)
  if (automation.trigger.type === "event") {
    await releaseSubscription(ctx, {
      tenantId: automation.tenantId,
      trigger: automation.trigger,
      exceptAutomationId: automation._id,
    })
  }

  const trigger = clearTriggerFunction(automation.trigger)
  await ctx.db.patch(automation._id, {
    trigger,
    status: "paused",
    updatedAt: Date.now(),
  })

  return await getRequiredAutomation(ctx, automation._id)
}

export async function resumeAutomation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    automationId: Id<"automations">
  }
) {
  const automation = await getTenantAutomation(
    ctx,
    args.tenantId,
    args.automationId
  )

  requirePausableAutomation(automation)

  if (automation.status === "active") {
    return automation
  }

  if (automation.status === "completed") {
    throw new Error("Completed automations cannot be resumed.")
  }

  const now = Date.now()
  const trigger =
    automation.trigger.type === "cron"
      ? await scheduleNextCronAutomation(ctx, automation, now)
      : automation.trigger

  if (trigger.type === "event") {
    await ensureSubscription(ctx, {
      tenantId: automation.tenantId,
      trigger,
    })
  }

  await ctx.db.patch(automation._id, {
    trigger,
    status: "active",
    updatedAt: now,
  })

  return await getRequiredAutomation(ctx, automation._id)
}

function requirePausableAutomation(automation: Doc<"automations">) {
  if (automation.type === "once" || automation.trigger.type === "once") {
    throw new Error("One-time automations cannot be paused.")
  }
}

function clearTriggerFunction(trigger: Doc<"automations">["trigger"]) {
  if (trigger.type !== "cron") {
    return trigger
  }

  return {
    type: trigger.type,
    cron: trigger.cron,
    nextAt: trigger.nextAt,
  }
}
