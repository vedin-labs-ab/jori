import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import {
  assertAutomationEventIsAvailable,
  getAutomationEventDefinition,
  legacyAutomationEventCriteria,
  normalizeAutomationEventCriteria,
} from "../events"
import { resolveEventIntegration } from "../integrations"
import { getTimeTrigger, getTimeTriggerAt } from "../schedule/timing"
import { type AutomationTriggerInput } from "../schema"

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
    const definition = getAutomationEventDefinition(
      args.trigger.integration,
      args.trigger.event
    )

    if (definition === undefined) {
      throw new Error("Choose a supported automation event.")
    }

    assertAutomationEventIsAvailable(definition)

    const criteria = normalizeAutomationEventCriteria(
      definition,
      args.trigger.criteria ??
        legacyAutomationEventCriteria(definition, args.trigger.filter)
    )

    return {
      type: "event",
      integrationId: (
        await resolveEventIntegration(ctx, {
          createdBy: args.createdBy,
          integration: args.trigger.integration,
          tenantId: args.tenantId,
        })
      )._id,
      event: definition.value,
      criteria,
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
