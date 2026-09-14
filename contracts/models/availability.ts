import { type ModelSlug } from "./catalog"
import { type ModelSelection } from "./selection"

/** Guidance inside the model picker, never a reason to block composing. */
export function modelAvailabilityReason(
  models: readonly ModelSlug[] | undefined,
  selection: ModelSelection
) {
  if (models === undefined) {
    return "Loading model choices…"
  }
  if (models.length === 0) {
    return "No model choices available. Try again shortly."
  }
  if (!models.includes(selection.model)) {
    return "Choose a model available in this region."
  }
  return undefined
}
