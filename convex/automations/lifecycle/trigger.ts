import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import {
  assertAutomationEventIsAvailable,
  getAutomationEventDefinition,
  normalizeAutomationEventMatch,
} from "../events"
import { resolveEventIntegration } from "../integrations"
import { type AutomationTriggerInput, type AutomationType } from "../schema"
import { getTimeTrigger, getTimeTriggerAt } from "../timing"

export async function resolveTrigger(
  ctx: MutationCtx,
  args: {
    createdBy: Id<"persons"> | undefined
    tenantId: string
    type: AutomationType
    trigger: AutomationTriggerInput
    now: number
  }
): Promise<Doc<"automations">["trigger"]> {
  if (args.type === "event") {
    if (!("integration" in args.trigger)) {
      throw new Error("Event automations need an event trigger.")
    }

    const definition = getAutomationEventDefinition(
      args.trigger.integration,
      args.trigger.event
    )

    if (definition === undefined) {
      throw new Error("Choose a supported automation event.")
    }

    assertAutomationEventIsAvailable(definition)

    const match = normalizeAutomationEventMatch(definition, args.trigger.match)

    return {
      integrationId: (
        await resolveEventIntegration(ctx, {
          createdBy: args.createdBy,
          integration: args.trigger.integration,
          tenantId: args.tenantId,
        })
      )._id,
      event: definition.value,
      match,
    }
  }

  if (args.type === "once") {
    if (!("at" in args.trigger)) {
      throw new Error("One-time automations need a time trigger.")
    }

    return getTimeTrigger({ type: "once", at: args.trigger.at }, args.now)
  }

  if (!("expression" in args.trigger)) {
    throw new Error("Recurring automations need a cron expression.")
  }

  return getTimeTrigger(
    { type: "cron", expression: args.trigger.expression },
    args.now
  )
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
  if (automation.type !== "cron" || !("expression" in automation.trigger)) {
    throw new Error("Automation does not use a cron trigger.")
  }

  const trigger = getTimeTrigger(
    { type: "cron", expression: automation.trigger.expression },
    now
  )

  return await scheduleTrigger(ctx, {
    automationId: automation._id,
    trigger,
  })
}

export async function cancelTrigger(
  ctx: MutationCtx,
  trigger: Doc<"automations">["trigger"]
) {
  if ("functionId" in trigger && trigger.functionId !== undefined) {
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
  if ("integrationId" in args.trigger) {
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
