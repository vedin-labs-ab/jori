import { defineTable } from "convex/server"
import { v } from "convex/values"

// The reply a run is composing, as far as it has streamed: the model's
// reasoning while it thinks, then the reply's text. One row per run,
// rewritten whole as either grows and gone once the reply is a message.
export const drafts = defineTable({
  runId: v.id("runs"),
  turn: v.number(),
  text: v.string(),
  /** The tail of the reasoning so far, capped by the writer. */
  reasoning: v.optional(v.string()),
  updatedAt: v.number(),
}).index("by_run", ["runId"])
