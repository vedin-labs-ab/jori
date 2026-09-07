import { defineTable } from "convex/server"
import { v } from "convex/values"

/**
 * What OpenRouter lists for a model Jori calls: the window its prompt and
 * completion share, and the completion's own cap where the provider sets
 * one. A daily refresh writes it; readers fall back to a constant until
 * the first row lands.
 */
export const models = defineTable({
  model: v.string(),
  contextLength: v.number(),
  maxCompletionTokens: v.optional(v.number()),
  fetchedAt: v.number(),
}).index("by_model", ["model"])
