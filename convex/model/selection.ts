import { v } from "convex/values"
import { models } from "../../contracts/models/catalog"
import {
  defaultSelection,
  type ModelSelection,
  reasoningEfforts,
} from "../../contracts/models/selection"

/** A model selection as the catalog allows it: one of its slugs at one of
 *  the offered efforts. Built from the catalog, so adding a model there is
 *  what admits it here. */
export const modelSelectionValidator = v.object({
  model: v.union(...models.map((model) => v.literal(model.slug))),
  effort: v.union(...reasoningEfforts.map((effort) => v.literal(effort))),
})

/** The selection a run or conversation is set to: its own, or the default
 *  when it carries none. */
export function runSelection(row: { model?: ModelSelection }): ModelSelection {
  return row.model ?? defaultSelection
}

export function runModel(row: { model?: ModelSelection }) {
  return runSelection(row).model
}
