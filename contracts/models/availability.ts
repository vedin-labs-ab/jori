import { type ModelSlug } from "./catalog"
import { type ModelSelection } from "./selection"

/** Availability belongs to the deployment, separate from model metadata. */
export function modelAvailabilityReason(
  models: readonly ModelSlug[] | undefined,
  selection: ModelSelection
) {
  if (models === undefined) {
    return "Checking model availability."
  }
  if (models.length === 0) {
    return "Models are unavailable. Try again shortly."
  }
  if (!models.includes(selection.model)) {
    return "Choose a model available in this region."
  }
  return undefined
}
