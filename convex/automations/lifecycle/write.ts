import { automationEventMatchKey } from "../../../contracts/automations/events"
import { type Scope } from "../../../contracts/permissions/scope"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { executionPrincipalForScope } from "../../runs/principal"
import { type AutomationAccessInput, resolveAccessInput } from "../access"
import { automationKeyPartition, findAutomationByKey } from "../keys"
import { type AutomationTriggerInput, type AutomationType } from "../schema"
import { ensureSubscription, releaseSubscription } from "../subscriptions/data"
import { normalizeRequiredText } from "../timing"
import { requireAutomationArtifact } from "./artifact"
import { getRequiredAutomation, getTenantAutomation } from "./read"
import { cancelTrigger, resolveTrigger, scheduleTrigger } from "./trigger"

type UpdateAutomationArgs = {
  tenantId: string
  automationId: Id<"automations">
  artifactId?: Id<"artifacts">
  name?: string
  instructions?: string
  scope?: Scope
  access?: AutomationAccessInput
  type?: AutomationType
  trigger?: AutomationTriggerInput
  updatedBy?: Id<"persons">
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
    existing.type === "event" &&
    "integrationId" in existing.trigger &&
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
  const principal =
    args.scope === undefined
      ? existing.principal
      : executionPrincipalForScope(args.scope, args.updatedBy)

  if (args.name !== undefined) {
    patch.name = normalizeRequiredText(args.name, "name")
  }

  if (args.instructions !== undefined) {
    patch.instructions = normalizeRequiredText(
      args.instructions,
      "instructions"
    )
  }

  await applyPrincipalPatch(ctx, args, existing, principal, patch)

  if (args.artifactId !== undefined) {
    patch.artifactId = args.artifactId
  }

  if (args.artifactId !== undefined || args.scope !== undefined) {
    await requireAutomationArtifact(ctx, {
      tenantId: args.tenantId,
      artifactId: args.artifactId ?? existing.artifactId,
      principal,
    })
  }

  if (args.access !== undefined) {
    patch.access = await resolveAccessInput(ctx, {
      access: args.access,
      artifactId: args.artifactId ?? existing.artifactId,
      principal,
      tenantId: existing.tenantId,
    })
  }

  if (
    args.trigger === undefined &&
    args.type !== undefined &&
    args.type !== existing.type
  ) {
    throw new Error("Changing automation type requires a trigger.")
  }

  if (args.trigger !== undefined) {
    Object.assign(
      patch,
      await buildTriggerPatch(
        ctx,
        args.automationId,
        existing,
        args.type ?? existing.type,
        args.trigger,
        now,
        principal
      )
    )
  }

  return patch
}

async function applyPrincipalPatch(
  ctx: MutationCtx,
  args: UpdateAutomationArgs,
  existing: Doc<"automations">,
  principal: Doc<"automations">["principal"],
  patch: Partial<Doc<"automations">>
) {
  if (args.scope === undefined) {
    return
  }

  if (args.access === undefined && args.scope !== existing.scope) {
    throw new Error("Changing sharing requires an updated access contract.")
  }

  if (
    args.scope !== existing.scope &&
    existing.type === "event" &&
    args.trigger === undefined
  ) {
    throw new Error("Changing sharing requires an updated event trigger.")
  }

  patch.scope = args.scope
  patch.principal = principal
  await updateKeyPartition(ctx, existing, principal, patch)
}

async function buildTriggerPatch(
  ctx: MutationCtx,
  automationId: Id<"automations">,
  existing: Doc<"automations">,
  type: AutomationType,
  input: AutomationTriggerInput,
  now: number,
  principal: Doc<"automations">["principal"]
) {
  await cancelTrigger(ctx, existing.trigger)
  const trigger = await resolveTrigger(ctx, {
    principal,
    tenantId: existing.tenantId,
    type,
    trigger: input,
    now,
  })
  const status = existing.status === "paused" ? "paused" : "active"
  const storedTrigger =
    status === "active"
      ? await scheduleTrigger(ctx, { automationId, trigger })
      : trigger

  if (
    status === "active" &&
    type === "event" &&
    "integrationId" in storedTrigger
  ) {
    await ensureSubscription(ctx, {
      tenantId: existing.tenantId,
      trigger: storedTrigger,
    })
  }

  return { status, trigger: storedTrigger, type }
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
  if (automation.type === "event" && "integrationId" in automation.trigger) {
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
    "integrationId" in left &&
    right !== undefined &&
    "integrationId" in right &&
    left.integrationId === right.integrationId &&
    left.event === right.event &&
    automationEventMatchKey(left.match) === automationEventMatchKey(right.match)
  )
}

async function updateKeyPartition(
  ctx: MutationCtx,
  existing: Doc<"automations">,
  principal: Doc<"automations">["principal"],
  patch: Partial<Doc<"automations">>
) {
  if (existing.key === undefined) {
    return
  }

  const keyPartition = automationKeyPartition(principal)
  const conflict = await findAutomationByKey(ctx, {
    tenantId: existing.tenantId,
    key: existing.key,
    keyPartition,
  })

  if (conflict !== null && conflict._id !== existing._id) {
    throw new Error("Automation key already exists in the new scope.")
  }

  patch.keyPartition = keyPartition
}
