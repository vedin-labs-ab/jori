import {
  type PlaybookCapability,
  type PlaybookSlot,
  playbookCapabilityLabels,
  playbookCapabilityProviders,
  playbookSlotTools,
} from "../../contracts/playbooks/capabilities"
import {
  getPlaybook,
  type PlaybookDefinition,
  playbookCatalog,
  resolvePlaybookSchedule,
} from "../../contracts/playbooks/catalog"
import {
  type DeliveryChoice,
  type DeliveryKind,
  deliveryKindProviders,
  destinationIntegration,
  destinationTools,
} from "../../contracts/playbooks/delivery"
import {
  type PlaybookOptionValues,
  resolvePlaybookOptions,
} from "../../contracts/playbooks/options"
import { playbookCron } from "../../contracts/playbooks/schedule"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createAutomation } from "../automations/lifecycle"
import { listActiveIntegrationsForOwner } from "../integrations/data"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration, integrationLabels } from "../shared/integrations"
import {
  emailInputProvider,
  type PlaybookRecipient,
  resolveDestination,
} from "./destination"
import { renderPlaybookInstructions } from "./instructions"

export type { PlaybookRecipient } from "./destination"

export type PlaybookSlotState = {
  capability: PlaybookCapability
  connected: Integration[]
}

type ResolvedSlot = {
  slot: PlaybookSlot
  integration: Integration
}

export type PlaybookPlanArgs = {
  tenantId: string
  key: string
  choices: Partial<Record<PlaybookCapability, Integration>>
  destination: DeliveryChoice
  options?: PlaybookOptionValues
  createdBy: Id<"persons">
  recipient: PlaybookRecipient
}

/** Resolve a playbook's input slots and delivery destination, and render it. */
export async function resolvePlaybookPlan(
  ctx: QueryLikeCtx,
  args: PlaybookPlanArgs
) {
  const definition = getPlaybook(args.key)
  const connected = await connectedIntegrations(ctx, {
    ownerId: args.createdBy,
    tenantId: args.tenantId,
  })
  const slots = readPlaybookSlots(definition, connected)
  const resolved: ResolvedSlot[] = definition.slots.map((slot, index) => ({
    slot,
    integration: resolveProvider(slots[index], args.choices[slot.capability]),
  }))
  const destination = resolveDestination(args.destination, {
    connected,
    emailProvider: emailInputProvider(resolved),
    recipient: args.recipient,
  })
  const options = resolvePlaybookOptions(definition.options, args.options)

  return {
    definition,
    destination,
    options,
    instructions: renderPlaybookInstructions({
      key: definition.key,
      providers: resolvedProviderLabels(resolved),
      destination,
      subject: definition.title,
      noun: definition.delivery.noun,
      style: definition.delivery.style,
      options,
    }),
    access: {
      integrations: [
        ...resolved.map(({ slot, integration }) => ({
          integration,
          tools: playbookSlotTools(slot, integration),
        })),
        {
          integration: destinationIntegration(destination),
          tools: destinationTools(destination),
        },
      ],
      web: definition.web,
    },
  }
}

export async function enablePlaybook(
  ctx: MutationCtx,
  args: PlaybookPlanArgs & {
    utcOffsetMinutes: number
  }
) {
  const plan = await resolvePlaybookPlan(ctx, args)

  await requireNotEnabled(ctx, {
    definition: plan.definition,
    ownerId: args.createdBy,
    tenantId: args.tenantId,
  })

  const automation = await createAutomation(ctx, {
    tenantId: args.tenantId,
    playbook: plan.definition.key,
    name: plan.definition.title,
    instructions: plan.instructions,
    scope: plan.definition.scope,
    access: plan.access,
    type: "cron",
    trigger: {
      expression: playbookCron(
        resolvePlaybookSchedule(plan.definition, plan.options),
        normalizeUtcOffset(args.utcOffsetMinutes)
      ),
    },
    createdBy: args.createdBy,
  })

  return { automationId: automation._id }
}

/** The caller's connected integrations, honouring user-scope ownership. */
export async function connectedIntegrations(
  ctx: QueryLikeCtx,
  args: { ownerId: Id<"persons"> | undefined; tenantId: string }
): Promise<Set<Integration>> {
  const integrations = await listActiveIntegrationsForOwner(ctx, args)

  return new Set(integrations.map((integration) => integration.integration))
}

export function readPlaybookSlots(
  definition: PlaybookDefinition,
  connected: Set<Integration>
): PlaybookSlotState[] {
  return definition.slots.map((slot) => ({
    capability: slot.capability,
    connected: playbookCapabilityProviders[slot.capability].filter((provider) =>
      connected.has(provider)
    ),
  }))
}

/** Delivery kinds the caller can pick: allowed by the playbook and connected. */
export function availableDelivery(
  definition: PlaybookDefinition,
  connected: Set<Integration>
): DeliveryKind[] {
  return definition.delivery.allowed.filter((kind) =>
    deliveryKindProviders[kind].some((provider) => connected.has(provider))
  )
}

/**
 * Playbook automations relevant to the caller, keyed by playbook key:
 * personal playbooks match only the caller's own enablement, organization
 * playbooks match the tenant-wide one.
 */
export async function readPlaybookAutomations(
  ctx: QueryLikeCtx,
  args: { ownerId: Id<"persons"> | undefined; tenantId: string }
) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_tenant", (index) => index.eq("tenantId", args.tenantId))
    .collect()
  const byKey = new Map<string, Doc<"automations">>()

  for (const automation of automations) {
    if (
      automation.playbook === undefined ||
      byKey.has(automation.playbook) ||
      !matchesPlaybookOwner(automation, args.ownerId)
    ) {
      continue
    }

    byKey.set(automation.playbook, automation)
  }

  return byKey
}

function matchesPlaybookOwner(
  automation: Doc<"automations">,
  ownerId: Id<"persons"> | undefined
) {
  const definition = playbookCatalog.find(
    (candidate) => candidate.key === automation.playbook
  )

  if (definition === undefined || definition.scope === "organization") {
    return true
  }

  return automation.createdBy === ownerId
}

async function requireNotEnabled(
  ctx: QueryLikeCtx,
  args: {
    definition: PlaybookDefinition
    ownerId: Id<"persons">
    tenantId: string
  }
) {
  const enabled = await readPlaybookAutomations(ctx, args)

  if (enabled.has(args.definition.key)) {
    throw new Error(`${args.definition.title} is already enabled.`)
  }
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

function resolvedProviderLabels(resolved: ResolvedSlot[]) {
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
