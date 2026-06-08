import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  integrations: defineTable({
    tenantId: v.string(),
    provider: v.literal("slack"),
    accountId: v.string(),
    tokenId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("revoked")
    ),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    data: v.optional(v.any()),
  })
    .index("by_tenant_provider", ["tenantId", "provider"])
    .index("by_provider_account", ["provider", "accountId"]),

  messages: defineTable({
    tenantId: v.string(),
    integrationId: v.id("integrations"),
    type: v.string(),
    providerId: v.string(),
    actorId: v.optional(v.string()),
    containerId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    text: v.optional(v.string()),
    data: v.optional(v.any()),
    occurredAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_provider_id", ["providerId"])
    .index("by_thread", ["tenantId", "integrationId", "threadId"]),

  triggers: defineTable({
    tenantId: v.string(),
    messageId: v.optional(v.id("messages")),
    type: v.union(
      v.literal("manual"),
      v.literal("scheduled"),
      v.literal("message")
    ),
    data: v.optional(v.any()),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_message", ["messageId"]),

  activations: defineTable({
    tenantId: v.string(),
    triggerId: v.id("triggers"),
    integrationId: v.id("integrations"),
    threadId: v.string(),
    executionId: v.optional(v.id("executions")),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_thread", ["tenantId", "integrationId", "threadId"])
    .index("by_execution", ["executionId"]),

  executions: defineTable({
    tenantId: v.string(),
    sandboxId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("stopped")
    ),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    finishedAt: v.optional(v.number()),
  }).index("by_tenant", ["tenantId"]),

  traces: defineTable({
    tenantId: v.string(),
    executionId: v.id("executions"),
    fileId: v.id("_storage"),
    createdAt: v.number(),
  }).index("by_execution", ["executionId"]),
})
