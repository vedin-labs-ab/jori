import { type ModelSlug, modelLabel } from "./catalog"

/**
 * What a chat runs on is a model and a reasoning effort together, never a
 * bare model: the effort decides as much of the cost and the quality as
 * the model does. The efforts are the SDK's `ChatRequestEffort` values
 * Jori offers, lowest first.
 */
export const reasoningEfforts = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const

export type ReasoningEffort = (typeof reasoningEfforts)[number]

export type ModelSelection = {
  model: ModelSlug
  effort: ReasoningEffort
}

/** The three recommended selections, cheapest first. Standard is the one
 *  every chat starts on and the one everything outside the chat runs on. */
export const tiers = {
  basic: { model: "openai/gpt-5.6-luna", effort: "max" },
  standard: { model: "openai/gpt-5.6-sol", effort: "medium" },
  premium: { model: "openai/gpt-6-astra", effort: "high" },
} as const satisfies Record<string, ModelSelection>

export type ModelTier = keyof typeof tiers

export const tierOrder = ["basic", "standard", "premium"] as const

export const tierLabels: Record<ModelTier, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
}

export const defaultSelection: ModelSelection = tiers.standard

/** The tier a selection is, or null for a model and effort outside the
 *  three. */
export function selectionTier(selection: ModelSelection): ModelTier | null {
  return tierOrder.find((tier) => sameSelection(tiers[tier], selection)) ?? null
}

export function sameSelection(left: ModelSelection, right: ModelSelection) {
  return left.model === right.model && left.effort === right.effort
}

/** A model picked on its own runs at medium effort; the runtime leaves
 *  the effort out of the request for a model that does not reason. */
export function selectModel(model: ModelSlug): ModelSelection {
  return { model, effort: "medium" }
}

/** How the composer names a selection: its tier, or its model's label. */
export function selectionLabel(selection: ModelSelection) {
  const tier = selectionTier(selection)

  return tier === null ? modelLabel(selection.model) : tierLabels[tier]
}
