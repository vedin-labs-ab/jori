import { defineTable } from "convex/server"
import { v } from "convex/values"

// The reply a run is composing, as far as it has streamed. One row per run,
// rewritten whole as the text grows and gone once the reply is a message.
export const drafts = defineTable({
  runId: v.id("runs"),
  turn: v.number(),
  text: v.string(),
  updatedAt: v.number(),
}).index("by_run", ["runId"])
