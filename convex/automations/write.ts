import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { ensureSubscription, releaseSubscription } from "../subscriptions/data"
import { type AutomationAccessInput, resolveAccessInput } from "./access"
import { getRequiredAutomation, getTenantAutomation } from "./read"
import { type AutomationTriggerInput } from "./schema"
import { normalizeRequiredText } from "./timing"
import {
  cancelTrigger,
  resolveTrigger,
  scheduleAutomationIfNeeded,
  scheduleTrigger,
} from "./trigger"

export async function createAutomation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    name: string
    instructions: string
    metadata?: unknown
    access: AutomationAccessInput
    trigger: AutomationTriggerInput
    createdBy?: string
  }
) {
  const now = Date.now()
  const trigger = await resolveTrigger(ctx, {
    createdBy: args.createdBy,
    tenantId: args.tenantId,
    trigger: args.trigger,
    now,
  })
  const automationId = await ctx.db.insert("automations", {
    tenantId: args.tenantId,
    name: normalizeRequiredText(args.name, "name"),
    instructions: normalizeRequiredText(args.instructions, "instructions"),
    metadata: args.metadata,
    access: await resolveAccessInput(ctx, {
      access: args.access,
      createdBy: args.createdBy,
      tenantId: args.tenantId,
    }),
    trigger,
    status: "active",
    createdBy: args.createdBy,
    createdAt: now,
    updatedAt: now,
  })

  await scheduleAutomationIfNeeded(ctx, automationId, trigger)
  if (trigger.type === "event") {
    await ensureSubscription(ctx, { tenantId: args.tenantId, trigger })
  }

  return await getRequiredAutomation(ctx, automationId)
}

export async function updateAutomation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    automationId: Id<"automations">
    name?: string
    instructions?: string
    metadata?: unknown
    access?: AutomationAccessInput
    trigger?: AutomationTriggerInput
  }
) {
  const existing = await getTenantAutomation(
    ctx,
    args.tenantId,
    args.automationId
  )
  const now = Date.now()
  const patch: Partial<Doc<"automations">> = { updatedAt: now }

  if (args.name !== undefined) {
    patch.name = normalizeRequiredText(args.name, "name")
  }

  if (args.instructions !== undefined) {
    patch.instructions = normalizeRequiredText(
      args.instructions,
      "instructions"
    )
  }

  if (Object.hasOwn(args, "metadata")) {
    patch.metadata = args.metadata ?? undefined
  }

  if (args.access !== undefined) {
    patch.access = await resolveAccessInput(ctx, {
      access: args.access,
      createdBy: existing.createdBy,
      tenantId: existing.tenantId,
    })
  }

  if (args.trigger !== undefined) {
    await cancelTrigger(ctx, existing.trigger)
    const trigger = await scheduleTrigger(ctx, {
      automationId: args.automationId,
      trigger: await resolveTrigger(ctx, {
        createdBy: existing.createdBy,
        tenantId: existing.tenantId,
        trigger: args.trigger,
        now,
      }),
    })
    patch.trigger = trigger
    patch.status = "active"
    if (trigger.type === "event") {
      await ensureSubscription(ctx, { tenantId: existing.tenantId, trigger })
    }
  }

  await ctx.db.patch(args.automationId, patch)
  if (
    args.trigger !== undefined &&
    existing.trigger.type === "event" &&
    !isSameEventTrigger(existing.trigger, patch.trigger)
  ) {
    await releaseSubscription(ctx, {
      tenantId: existing.tenantId,
      trigger: existing.trigger,
      exceptAutomationId: args.automationId,
    })
  }

  return await getRequiredAutomation(ctx, args.automationId)
}

export async function removeAutomation(
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

  await cancelTrigger(ctx, automation.trigger)
  await ctx.db.delete(args.automationId)
  if (automation.trigger.type === "event") {
    await releaseSubscription(ctx, {
      tenantId: automation.tenantId,
      trigger: automation.trigger,
    })
  }

  return { deleted: true, automationId: args.automationId }
}

function isSameEventTrigger(
  left: Doc<"automations">["trigger"],
  right: Doc<"automations">["trigger"] | undefined
) {
  return (
    left.type === "event" &&
    right?.type === "event" &&
    left.integrationId === right.integrationId &&
    left.event === right.event &&
    left.filter === right.filter
  )
}
