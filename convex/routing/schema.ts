import { defineTable } from "convex/server"
import { v } from "convex/values"

export const routingRoute = v.union(
  v.literal("ignore"),
  v.literal("respond"),
  v.literal("agent")
)

export const routing = defineTable({
  messageId: v.id("messages"),
  route: routingRoute,
  reply: v.optional(v.string()),
  runId: v.optional(v.id("runs")),
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_run", ["runId"])
