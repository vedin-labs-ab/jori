import { defineTable } from "convex/server"
import { v } from "convex/values"

export const sandboxes = defineTable({
  tenantId: v.string(),
  runId: v.id("runs"),
  externalId: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("idle"),
    v.literal("cleaned"),
    v.literal("failed")
  ),
  conversationId: v.optional(v.id("conversations")),
  watchId: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_run_and_status", ["runId", "status"])
  .index("by_external_id", ["externalId"])
  .index("by_tenant_and_conversation_and_status_and_expires_at", [
    "tenantId",
    "conversationId",
    "status",
    "expiresAt",
  ])
