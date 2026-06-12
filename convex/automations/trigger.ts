import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { resolveEventIntegration } from "./access"
import { type AutomationTriggerInput } from "./schema"
import {
  getTimeTrigger,
  getTimeTriggerAt,
  normalizeRequiredText,
} from "./timing"

export async function resolveTrigger(
  ctx: MutationCtx,
  args: {
    createdBy: string | undefined
    tenantId: string
    trigger: AutomationTriggerInput
    now: number
  }
): Promise<Doc<"automations">["trigger"]> {
  if (args.trigger.type === "event") {
    return {
      type: "event",
      integrationId: (
        await resolveEventIntegration(ctx, {
          createdBy: args.createdBy,
          provider: args.trigger.provider,
          tenantId: args.tenantId,
        })
      )._id,
      event: normalizeRequiredText(args.trigger.event, "event"),
      filter: normalizeOptionalText(args.trigger.filter),
    }
  }

  return getTimeTrigger(args.trigger, args.now)
}

export async function scheduleAutomationIfNeeded(
  ctx: MutationCtx,
  automationId: Id<"automations">,
  trigger: Doc<"automations">["trigger"]
) {
  const scheduledTrigger = await scheduleTrigger(ctx, {
    automationId,
    trigger,
  })

  if (scheduledTrigger !== trigger) {
    await ctx.db.patch(automationId, { trigger: scheduledTrigger })
  }
}

export async function scheduleNextCronAutomation(
  ctx: MutationCtx,
  automation: Doc<"automations">,
  now: number
) {
  if (automation.trigger.type !== "cron") {
    throw new Error("Automation does not use a cron trigger.")
  }

  const trigger = getTimeTrigger(
    { type: "cron", cron: automation.trigger.cron },
    now
  )

  if (trigger.type !== "cron") {
    throw new Error("Cron automation resolved to a non-cron trigger.")
  }

  return await scheduleTrigger(ctx, {
    automationId: automation._id,
    trigger,
  })
}

export async function cancelTrigger(
  ctx: MutationCtx,
  trigger: Doc<"automations">["trigger"]
) {
  if (trigger.type !== "event" && trigger.functionId !== undefined) {
    await ctx.scheduler.cancel(trigger.functionId)
  }
}

export async function scheduleTrigger(
  ctx: MutationCtx,
  args: {
    automationId: Id<"automations">
    trigger: Doc<"automations">["trigger"]
  }
) {
  if (args.trigger.type === "event") {
    return args.trigger
  }

  const expectedAt = getTimeTriggerAt(args.trigger)
  const functionId = await ctx.scheduler.runAt(
    expectedAt,
    internal.automations.records.fire,
    {
      automationId: args.automationId,
      expectedAt,
    }
  )

  return { ...args.trigger, functionId }
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim()

  return normalized === "" ? undefined : normalized
}
