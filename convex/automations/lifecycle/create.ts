import {
  defaultScopeForIntegrations,
  type Scope,
} from "../../../contracts/permissions/scope"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
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
import { getRequiredAutomation } from "./read"
import { resolveTrigger, scheduleAutomationIfNeeded } from "./trigger"

type CreateAutomationArgs = {
  tenantId: string
  artifactId?: Id<"artifacts">
  playbook?: string
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
