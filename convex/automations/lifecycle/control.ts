import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { ensureSubscription, releaseSubscription } from "../subscriptions/data"
import { deleteOwnedAutomations } from "./children"
import { getOrganizationAutomation, getRequiredAutomation } from "./read"
import { cancelTrigger, scheduleNextCronAutomation } from "./trigger"

export async function pauseAutomation(
  ctx: MutationCtx,
  args: {
    organizationId: string
    automationId: Id<"automations">
  }
) {
  const automation = await getOrganizationAutomation(
    ctx,
    args.organizationId,
    args.automationId
  )

  requirePausableAutomation(automation)

  if (automation.status === "paused") {
    return automation
  }

  if (automation.status === "completed") {
    throw new Error("Completed automations cannot be paused.")
  }

  await stopAutomation(ctx, automation)

  const trigger = clearTriggerFunction(automation.trigger)
  await ctx.db.patch(automation._id, {
    configurationVersion: (automation.configurationVersion ?? 1) + 1,
    trigger,
    status: "paused",
    updatedAt: Date.now(),
  })
  await deleteOwnedAutomations(ctx, automation._id)

  return await getRequiredAutomation(ctx, automation._id)
}

export async function resumeAutomation(
  ctx: MutationCtx,
  args: {
    organizationId: string
    automationId: Id<"automations">
  }
) {
  const automation = await getOrganizationAutomation(
    ctx,
    args.organizationId,
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
    automation.type === "cron"
      ? await scheduleNextCronAutomation(ctx, automation, now)
      : automation.trigger

  if (automation.type === "event" && "integrationId" in trigger) {
    await ensureSubscription(ctx, {
      organizationId: automation.organizationId,
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

export async function removeAutomation(
  ctx: MutationCtx,
  args: {
    organizationId: string
    automationId: Id<"automations">
  }
) {
  const automation = await getOrganizationAutomation(
    ctx,
    args.organizationId,
    args.automationId
  )

  await stopAutomation(ctx, automation)
  await ctx.db.delete(automation._id)
  await deleteOwnedAutomations(ctx, automation._id)

  return { deleted: true, automationId: automation._id }
}

async function stopAutomation(
  ctx: MutationCtx,
  automation: Doc<"automations">
) {
  await cancelTrigger(ctx, automation.trigger)

  if (automation.type === "event" && "integrationId" in automation.trigger) {
    await releaseSubscription(ctx, {
      organizationId: automation.organizationId,
      trigger: automation.trigger,
      exceptAutomationId: automation._id,
    })
  }
}

function requirePausableAutomation(automation: Doc<"automations">) {
  if (automation.type === "once") {
    throw new Error("One-time automations cannot be paused.")
  }
}

function clearTriggerFunction(trigger: Doc<"automations">["trigger"]) {
  if (!("nextAt" in trigger)) {
    return trigger
  }

  return {
    expression: trigger.expression,
    timezone: trigger.timezone,
    nextAt: trigger.nextAt,
  }
}
