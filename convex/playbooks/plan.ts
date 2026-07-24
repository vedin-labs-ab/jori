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
  resolveValidPlaybookOptions,
} from "../../contracts/playbooks/catalog"
import {
  type DeliveryChoice,
  destinationIntegration,
  destinationTools,
} from "../../contracts/playbooks/delivery"
import { type PlaybookOptionValues } from "../../contracts/playbooks/options"
import { type Id } from "../_generated/dataModel"
import { listActiveIntegrationsForOwner } from "../integrations/data"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration, integrationLabels } from "../shared/integrations"
import {
  emailInputProvider,
  type PlaybookRecipient,
  resolveDestination,
} from "./destination"
import { renderPlaybookInstructions } from "./instructions"

export type PlaybookSlotState = {
  capability: PlaybookCapability
  connected: Integration[]
}

type ResolvedSlot = {
  slot: PlaybookSlot
  integration: Integration
}

export type PlaybookPlanArgs = {
  organizationId: string
  key: string
  choices: Partial<Record<PlaybookCapability, Integration>>
  destination: DeliveryChoice
  options?: PlaybookOptionValues
  createdBy: Id<"persons">
  recipient: PlaybookRecipient
  appId?: Id<"apps">
}

export type PlaybookPlan = Awaited<ReturnType<typeof resolvePlaybookPlan>>

/** Resolve a playbook's input slots and delivery destination, and render it. */
export async function resolvePlaybookPlan(
  ctx: QueryLikeCtx,
  args: PlaybookPlanArgs
) {
  const definition = getPlaybook(args.key)
  const connected = await connectedIntegrations(ctx, {
    ownerId: args.createdBy,
    organizationId: args.organizationId,
  })
  const slots = readPlaybookSlots(definition, connected)
  const resolved: ResolvedSlot[] = definition.slots.map((slot, index) => ({
    slot,
    integration: resolveProvider(slots[index], args.choices[slot.capability]),
  }))
  const destination = await resolveDestination(ctx, args.destination, {
    connected,
    createdBy: args.createdBy,
    delivery: definition.delivery,
    emailProvider: emailInputProvider(resolved),
    recipient: args.recipient,
  })
  const options = resolveValidPlaybookOptions(definition, args.options)
  const providers = resolvedProviderKeys(resolved)

  return {
    definition,
    destination,
    options,
    providers,
    instructions: renderPlaybookInstructions({
      definition,
      providers: resolvedProviderLabels(resolved),
      destination,
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

/** The caller's connected integrations, honouring user-scope ownership. */
export async function connectedIntegrations(
  ctx: QueryLikeCtx,
  args: { ownerId: Id<"persons"> | undefined; organizationId: string }
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

function resolvedProviderKeys(resolved: ResolvedSlot[]) {
  const providers: Partial<Record<PlaybookCapability, Integration>> = {}

  for (const { slot, integration } of resolved) {
    providers[slot.capability] = integration
  }

  return providers
}
