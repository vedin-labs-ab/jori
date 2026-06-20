import { defineTable } from "convex/server"
import { v } from "convex/values"

export const routingRoute = v.union(
  v.literal("ignore"),
  v.literal("respond"),
  v.literal("agent")
)

export const routing = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  messageId: v.id("messages"),
  conversationId: v.optional(v.string()),
  route: routingRoute,
  reply: v.optional(v.string()),
  model: v.optional(v.string()),
  error: v.optional(v.string()),
  runId: v.optional(v.id("runs")),
  executionId: v.optional(v.id("executions")),
  replyMessageTs: v.optional(v.string()),
  replyClaimUntil: v.optional(v.number()),
  replyError: v.optional(v.string()),
  finalReply: v.optional(v.string()),
  finalReplyMessageTs: v.optional(v.string()),
  finalReplyClaimUntil: v.optional(v.number()),
  finalReplyError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_conversation", ["tenantId", "integrationId", "conversationId"])
  .index("by_run", ["runId"])
