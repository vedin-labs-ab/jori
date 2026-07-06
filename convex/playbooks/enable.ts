import {
  type PlaybookCapability,
  playbookCapabilityLabels,
  playbookCapabilityProviders,
  playbookSlotTools,
} from "../../contracts/playbooks/capabilities"
import {
  getPlaybook,
  type PlaybookDefinition,
} from "../../contracts/playbooks/catalog"
import { playbookCron } from "../../contracts/playbooks/schedule"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { findEventIntegration } from "../automations/integrations"
import { createAutomation, createAutomationRun } from "../automations/lifecycle"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration, integrationLabels } from "../shared/integrations"

export type PlaybookSlotState = {
  capability: PlaybookCapability
  connected: Integration[]
}

export async function enablePlaybook(
  ctx: MutationCtx,
  args: {
    tenantId: string
    key: string
    utcOffsetMinutes: number
    choices: Partial<Record<PlaybookCapability, Integration>>
    createdBy: Id<"persons">
    recipient: { email: string; name?: string }
  }
) {
  const definition = getPlaybook(args.key)

  await requireNotEnabled(ctx, args.tenantId, definition)

  const slots = await readPlaybookSlots(ctx, {
    definition,
    ownerId: args.createdBy,
    tenantId: args.tenantId,
  })
  const resolved = definition.slots.map((slot, index) => ({
    slot,
    integration: resolveProvider(slots[index], args.choices[slot.capability]),
  }))
  const automation = await createAutomation(ctx, {
    tenantId: args.tenantId,
    playbook: definition.key,
    name: definition.title,
    instructions: definition.instructions({
      providers: resolvedProviderLabels(resolved),
      recipient: args.recipient,
    }),
    access: {
      integrations: resolved.map(({ slot, integration }) => ({
        integration,
        tools: playbookSlotTools(slot, integration),
      })),
      web: definition.web,
    },
    type: "cron",
    trigger: {
      expression: playbookCron(
        definition.schedule,
        normalizeUtcOffset(args.utcOffsetMinutes)
      ),
    },
    createdBy: args.createdBy,
  })

  // The first run fires immediately so enabling proves its value right away.
  const runId = await createAutomationRun(ctx, {
    automation,
    cause: { type: "manual", personId: args.createdBy },
    now: Date.now(),
  })

  return { automationId: automation._id, runId }
}

export async function readPlaybookSlots(
  ctx: QueryLikeCtx,
  args: {
    definition: PlaybookDefinition
    ownerId: Id<"persons"> | undefined
    tenantId: string
  }
): Promise<PlaybookSlotState[]> {
  return await Promise.all(
    args.definition.slots.map(async (slot) => ({
      capability: slot.capability,
      connected: await connectedProviders(ctx, slot.capability, args),
    }))
  )
}

/** Playbook-instantiated automations per tenant, keyed by playbook key. */
export async function readPlaybookAutomations(
  ctx: QueryLikeCtx,
  tenantId: string
) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_tenant", (index) => index.eq("tenantId", tenantId))
    .collect()
  const byKey = new Map<string, Doc<"automations">>()

  for (const automation of automations) {
    if (automation.playbook !== undefined && !byKey.has(automation.playbook)) {
      byKey.set(automation.playbook, automation)
    }
  }

  return byKey
}

async function requireNotEnabled(
  ctx: QueryLikeCtx,
  tenantId: string,
  definition: PlaybookDefinition
) {
  const enabled = await readPlaybookAutomations(ctx, tenantId)

  if (enabled.has(definition.key)) {
    throw new Error(`${definition.title} is already enabled.`)
  }
}

async function connectedProviders(
  ctx: QueryLikeCtx,
  capability: PlaybookCapability,
  args: { ownerId: Id<"persons"> | undefined; tenantId: string }
) {
  const providers = await Promise.all(
    playbookCapabilityProviders[capability].map(async (provider) => {
      const integration = await findEventIntegration(ctx, {
        integration: provider,
        ownerId: args.ownerId,
        tenantId: args.tenantId,
      })

      return integration?.status === "active" ? provider : undefined
    })
  )

  return providers.filter((provider) => provider !== undefined)
}

function resolveProvider(
  slot: PlaybookSlotState,
  choice: Integration | undefined
): Integration {
  if (choice !== undefined) {
    if (!slot.connected.includes(choice)) {
      throw new Error(`${integrationLabels[choice]} is not connected.`)
    }

    return choice
  }

  if (slot.connected.length === 0) {
    throw new Error(
      `Connect ${providerChoices(slot.capability)} to enable this playbook.`
    )
  }

  if (slot.connected.length > 1) {
    throw new Error(
      `Choose between ${providerChoices(slot.capability)} for this playbook.`
    )
  }

  return slot.connected[0]
}

function providerChoices(capability: PlaybookCapability) {
  return playbookCapabilityProviders[capability]
    .map((provider) => integrationLabels[provider])
    .join(" or ")
}

function resolvedProviderLabels(
  resolved: {
    slot: { capability: PlaybookCapability }
    integration: Integration
  }[]
) {
  const labels = { ...playbookCapabilityLabels }

  for (const { slot, integration } of resolved) {
    labels[slot.capability] = integrationLabels[integration]
  }

  return labels
}

function normalizeUtcOffset(utcOffsetMinutes: number) {
  if (
    !Number.isInteger(utcOffsetMinutes) ||
    Math.abs(utcOffsetMinutes) > 16 * 60
  ) {
    throw new Error("Invalid timezone offset.")
  }

  return utcOffsetMinutes
}
