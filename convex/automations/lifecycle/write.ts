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
import { deleteOwnedAutomations, requireValidOwnershipUpdate } from "./children"
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
  await requireValidOwnershipUpdate(ctx, args, existing)
  const now = Date.now()
  const patch = await buildAutomationPatch(ctx, args, existing, now)
  const invalidatesChildren =
    existing.parentId === undefined && ownedAutomationsAreStale(existing, patch)

  if (invalidatesChildren) {
    patch.configurationVersion = (existing.configurationVersion ?? 1) + 1
  }

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
  if (invalidatesChildren) {
    await deleteOwnedAutomations(ctx, existing._id)
  }

  return await getRequiredAutomation(ctx, args.automationId)
}

export function ownedAutomationsAreStale(
  existing: Doc<"automations">,
  patch: Partial<Doc<"automations">>
) {
  return (
    (patch.artifactId !== undefined &&
      patch.artifactId !== existing.artifactId) ||
    (patch.instructions !== undefined &&
      patch.instructions !== existing.instructions) ||
    (patch.scope !== undefined && patch.scope !== existing.scope) ||
    (patch.type !== undefined && patch.type !== existing.type) ||
    (patch.access !== undefined &&
      JSON.stringify(patch.access) !== JSON.stringify(existing.access)) ||
    (patch.trigger !== undefined &&
      !sameTriggerDefinition(existing.trigger, patch.trigger))
  )
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

function sameTriggerDefinition(
  left: Doc<"automations">["trigger"],
  right: Doc<"automations">["trigger"]
) {
  if ("at" in left || "at" in right) {
    return "at" in left && "at" in right && left.at === right.at
  }

  if ("expression" in left || "expression" in right) {
    return (
      "expression" in left &&
      "expression" in right &&
      left.expression === right.expression &&
      left.timezone === right.timezone
    )
  }

  return isSameEventTrigger(left, right)
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
