import { defineTable } from "convex/server"
import { v } from "convex/values"

// Delivery metadata only. Event content belongs in the regional webhook inbox.
export const githubRecoveries = defineTable({
  eventId: v.string(),
  attempts: v.number(),
  requestedAt: v.number(),
})
  .index("by_eventId", ["eventId"])
  .index("by_requestedAt", ["requestedAt"])
