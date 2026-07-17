import {
  defaultScopeForIntegrations,
  type Scope,
} from "../../../contracts/permissions/scope"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type PlaybookBinding } from "../../playbooks/schema"
import { executionPrincipalForScope } from "../../runs/principal"
import { type AutomationAccessInput, resolveAccessInput } from "../access"
import {
  automationKeyPartition,
  findAutomationByKey,
  normalizeAutomationKey,
  sameAutomationDefinition,
} from "../keys"
import { type AutomationTriggerInput, type AutomationType } from "../schema"
import { ensureSubscription } from "../subscriptions/data"
import { normalizeRequiredText } from "../timing"
import { requireAutomationArtifact } from "./artifact"
import { sameAutomationPrincipal } from "./children"
import { getRequiredAutomation } from "./read"
import { resolveTrigger, scheduleAutomationIfNeeded } from "./trigger"

type CreateAutomationArgs = {
  tenantId: string
  artifactId?: Id<"artifacts">
  parentId?: Id<"automations">
  expectedParentConfigurationVersion?: number
  playbook?: PlaybookBinding
  key?: string
  name: string
  instructions: string
  scope?: Scope
  access: AutomationAccessInput
  type: AutomationType
  trigger: AutomationTriggerInput
  createdBy?: Id<"persons">
}

export async function createAutomation(
  ctx: MutationCtx,
  args: CreateAutomationArgs
) {
  const now = Date.now()
  const prepared = await prepareAutomation(ctx, args, now)
  const existing = await keyedAutomation(ctx, prepared)

  if (existing !== null) {
    if (!sameAutomationDefinition(existing, prepared)) {
      throw new Error("Automation key already has different configuration.")
    }

    return { ...existing, created: false }
  }

  const automationId = await ctx.db.insert("automations", {
    ...prepared,
    status: "active",
    createdAt: now,
    updatedAt: now,
  })

  await activateAutomation(ctx, automationId, prepared)

  return { ...(await getRequiredAutomation(ctx, automationId)), created: true }
}

async function prepareAutomation(
  ctx: MutationCtx,
  args: CreateAutomationArgs,
  now: number
) {
  const scope =
    args.scope ??
    defaultScopeForIntegrations(
      args.access.integrations.map((entry) => entry.integration)
    )
  const key = normalizeAutomationKey(args.key)
  const principal = executionPrincipalForScope(scope, args.createdBy)
  const ownership = await resolveOwnership(ctx, {
    ownerId: args.parentId,
    expectedConfigurationVersion: args.expectedParentConfigurationVersion,
    principal,
    tenantId: args.tenantId,
    type: args.type,
  })
  const trigger = await resolveTrigger(ctx, {
    principal,
    tenantId: args.tenantId,
    type: args.type,
    trigger: args.trigger,
    now,
  })

  await requireAutomationArtifact(ctx, {
    tenantId: args.tenantId,
    artifactId: args.artifactId,
    principal,
  })

  return {
    tenantId: args.tenantId,
    artifactId: args.artifactId,
    parentId: ownership?.parentId,
    parentConfigurationVersion: ownership?.configurationVersion,
    configurationVersion: 1,
    playbook: args.playbook,
    key,
    ...(key === undefined
      ? {}
      : { keyPartition: automationKeyPartition(principal) }),
    name: normalizeRequiredText(args.name, "name"),
    instructions: normalizeRequiredText(args.instructions, "instructions"),
    scope,
    principal,
    type: args.type,
    access: await resolveAccessInput(ctx, {
      access: args.access,
      artifactId: args.artifactId,
      principal,
      tenantId: args.tenantId,
    }),
    trigger,
    createdBy: args.createdBy,
  }
}

async function resolveOwnership(
  ctx: MutationCtx,
  args: {
    ownerId?: Id<"automations">
    expectedConfigurationVersion?: number
    principal: ReturnType<typeof executionPrincipalForScope>
    tenantId: string
    type: AutomationType
  }
) {
  if (args.ownerId === undefined) {
    return undefined
  }

  if (args.type !== "once") {
    return undefined
  }

  const owner = await ctx.db.get(args.ownerId)
  if (owner === null) {
    throw new Error("Parent automation is no longer available.")
  }

  const parent =
    owner.type === "once" && owner.parentId !== undefined
      ? await ctx.db.get(owner.parentId)
      : owner.type === "once"
        ? null
        : owner

  if (parent === null) {
    return undefined
  }

  if (
    parent.tenantId !== args.tenantId ||
    parent.status !== "active" ||
    parent.type === "once" ||
    !sameAutomationPrincipal(parent.principal, args.principal)
  ) {
    throw new Error("Parent automation is no longer active in this scope.")
  }

  const configurationVersion = parent.configurationVersion ?? 1

  if (args.expectedConfigurationVersion !== configurationVersion) {
    throw new Error("Parent automation configuration has changed.")
  }

  return { parentId: parent._id, configurationVersion }
}

async function keyedAutomation(
  ctx: MutationCtx,
  prepared: Awaited<ReturnType<typeof prepareAutomation>>
) {
  return prepared.key === undefined || prepared.keyPartition === undefined
    ? null
    : await findAutomationByKey(ctx, {
        tenantId: prepared.tenantId,
        key: prepared.key,
        keyPartition: prepared.keyPartition,
      })
}

async function activateAutomation(
  ctx: MutationCtx,
  automationId: Id<"automations">,
  prepared: Awaited<ReturnType<typeof prepareAutomation>>
) {
  await scheduleAutomationIfNeeded(ctx, automationId, prepared.trigger)

  if (prepared.type === "event" && "integrationId" in prepared.trigger) {
    await ensureSubscription(ctx, {
      tenantId: prepared.tenantId,
      trigger: prepared.trigger,
    })
  }
}
