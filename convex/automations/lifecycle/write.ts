import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type AutomationAccessInput, resolveAccessInput } from "../access"
import { automationEventCriteriaKey } from "../events"
import { normalizeRequiredText } from "../schedule/timing"
import { type AutomationTriggerInput } from "../schema"
import { ensureSubscription, releaseSubscription } from "../subscriptions/data"
import { getRequiredAutomation, getTenantAutomation } from "./read"
import {
  cancelTrigger,
  resolveTrigger,
  scheduleAutomationIfNeeded,
  scheduleTrigger,
} from "./trigger"

type UpdateAutomationArgs = {
  tenantId: string
  automationId: Id<"automations">
  artifactId?: Id<"artifacts">
  name?: string
  instructions?: string
  access?: AutomationAccessInput
  trigger?: AutomationTriggerInput
}

export async function createAutomation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    artifactId?: Id<"artifacts">
    name: string
    instructions: string
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
  await requireArtifact(ctx, args.tenantId, args.artifactId)

  const automationId = await ctx.db.insert("automations", {
    tenantId: args.tenantId,
    artifactId: args.artifactId,
    name: normalizeRequiredText(args.name, "name"),
    instructions: normalizeRequiredText(args.instructions, "instructions"),
    type: trigger.type,
    access: await resolveAccessInput(ctx, {
      access: args.access,
      artifactId: args.artifactId,
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
  args: UpdateAutomationArgs
) {
  const existing = await getTenantAutomation(
    ctx,
    args.tenantId,
    args.automationId
  )
  const now = Date.now()
  const patch = await buildAutomationPatch(ctx, args, existing, now)

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

async function buildAutomationPatch(
  ctx: MutationCtx,
  args: UpdateAutomationArgs,
  existing: Doc<"automations">,
  now: number
) {
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

  if (args.artifactId !== undefined) {
    await requireArtifact(ctx, args.tenantId, args.artifactId)
    patch.artifactId = args.artifactId
  }

  if (args.access !== undefined) {
    patch.access = await resolveAccessInput(ctx, {
      access: args.access,
      artifactId: args.artifactId ?? existing.artifactId,
      createdBy: existing.createdBy,
      tenantId: existing.tenantId,
    })
  }

  if (args.trigger !== undefined) {
    Object.assign(
      patch,
      await buildTriggerPatch(
        ctx,
        args.automationId,
        existing,
        args.trigger,
        now
      )
    )
  }

  return patch
}

async function buildTriggerPatch(
  ctx: MutationCtx,
  automationId: Id<"automations">,
  existing: Doc<"automations">,
  input: AutomationTriggerInput,
  now: number
) {
  await cancelTrigger(ctx, existing.trigger)
  const trigger = await resolveTrigger(ctx, {
    createdBy: existing.createdBy,
    tenantId: existing.tenantId,
    trigger: input,
    now,
  })
  const status = existing.status === "paused" ? "paused" : "active"
  const storedTrigger =
    status === "active"
      ? await scheduleTrigger(ctx, { automationId, trigger })
      : trigger

  if (status === "active" && storedTrigger.type === "event") {
    await ensureSubscription(ctx, {
      tenantId: existing.tenantId,
      trigger: storedTrigger,
    })
  }

  return { status, trigger: storedTrigger, type: storedTrigger.type }
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
    automationEventCriteriaKey(left.criteria) ===
      automationEventCriteriaKey(right.criteria)
  )
}

async function requireArtifact(
  ctx: MutationCtx,
  tenantId: string,
  artifactId: Id<"artifacts"> | undefined
) {
  if (artifactId === undefined) {
    return
  }

  const artifact = await ctx.db.get(artifactId)

  if (artifact === null || artifact.tenantId !== tenantId) {
    throw new Error("Artifact automation owner is invalid.")
  }
}
