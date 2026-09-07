import { defineTable } from "convex/server"
import { v } from "convex/values"

/** Micro-dollars per token, as the listing prices the model today. */
export const modelRateValidator = v.object({
  inputMicrosPerToken: v.number(),
  outputMicrosPerToken: v.number(),
})

/**
 * What OpenRouter lists for a model in Jori's catalog: the window its
 * prompt and completion share, the completion's own cap where the
 * provider sets one, and the list rate usage is priced at. A daily
 * refresh writes it; readers fall back to the catalog's constants until
 * the first row lands.
 */
export const models = defineTable({
  model: v.string(),
  contextLength: v.number(),
  maxCompletionTokens: v.optional(v.number()),
  rate: modelRateValidator,
  fetchedAt: v.number(),
}).index("by_model", ["model"])
