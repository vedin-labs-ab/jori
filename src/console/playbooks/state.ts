import {
  type Integration,
  integrationLabels,
  providerForIntegration,
} from "@contracts/integrations"
import {
  type PlaybookCapability,
  type PlaybookSlot,
  playbookCapabilityProviders,
} from "@contracts/playbooks/capabilities"
import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"

export type PlaybookListRow = FunctionReturnType<
  typeof api.playbooks.console.list
>["playbooks"][number]

export type PlaybookSlotState = PlaybookListRow["slots"][number]

export type PlaybookEnableOption = {
  label: string
  choices: Record<string, Integration>
}

export type PlaybookEnablePlan =
  | { kind: "connect"; label: string }
  | { kind: "enable"; choices: Record<string, Integration> }
  | { kind: "choose"; options: PlaybookEnableOption[] }

const familyLabels: Record<string, string> = {
  google: "Google",
  microsoft: "Microsoft",
}

export function planPlaybookEnable(
  slots: PlaybookSlotState[]
): PlaybookEnablePlan {
  const missing = slots.find((slot) => slot.connected.length === 0)

  if (missing !== undefined) {
    return { kind: "connect", label: connectLabel(missing.capability) }
  }

  const options = enableOptions(slots)

  return options.length === 1
    ? { kind: "enable", choices: options[0].choices }
    : { kind: "choose", options }
}

/** Providers to show for a slot: connected ones, or all candidates dimmed. */
export function slotDisplayProviders(
  slot: PlaybookSlot,
  row: PlaybookListRow | undefined
) {
  const connected =
    row?.slots.find((state) => state.capability === slot.capability)
      ?.connected ?? []

  if (connected.length > 0) {
    return connected.map((integration) => ({ integration, connected: true }))
  }

  return playbookCapabilityProviders[slot.capability].map((integration) => ({
    integration,
    connected: false,
  }))
}

/**
 * Ambiguity collapses into at most one choice: when a slot has several
 * connected providers, offer one option per provider family (Google,
 * Microsoft), resolving every slot to that family where possible.
 */
function enableOptions(slots: PlaybookSlotState[]): PlaybookEnableOption[] {
  const ambiguous = slots.filter((slot) => slot.connected.length > 1)

  if (ambiguous.length === 0) {
    return [{ label: "", choices: soleChoices(slots) }]
  }

  const families = [
    ...new Set(
      ambiguous.flatMap((slot) => slot.connected.map(providerForIntegration))
    ),
  ]

  return families.map((family) => ({
    label: optionLabel(ambiguous, family),
    choices: Object.fromEntries(
      slots.map((slot) => [slot.capability, familyProvider(slot, family)])
    ),
  }))
}

function familyProvider(slot: PlaybookSlotState, family: string) {
  return (
    slot.connected.find(
      (integration) => providerForIntegration(integration) === family
    ) ?? slot.connected[0]
  )
}

function optionLabel(ambiguous: PlaybookSlotState[], family: string) {
  if (ambiguous.length === 1) {
    return integrationLabels[familyProvider(ambiguous[0], family)]
  }

  return familyLabels[family] ?? family
}

function soleChoices(slots: PlaybookSlotState[]) {
  return Object.fromEntries(
    slots.map((slot) => [slot.capability, slot.connected[0]])
  )
}

function connectLabel(capability: PlaybookCapability) {
  const labels = playbookCapabilityProviders[capability].map(
    (integration) => integrationLabels[integration]
  )

  return `Connect ${labels.join(" or ")}`
}

/** Label for reconnecting the integrations an enabled playbook is bound to. */
export function connectMissingLabel(missing: Integration[]) {
  const labels = missing.map((integration) => integrationLabels[integration])

  return `Connect ${labels.join(" and ")}`
}
