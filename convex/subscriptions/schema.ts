import { defineTable } from "convex/server"
import { v } from "convex/values"

export const subscriptionStatus = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("failed")
)

export const subscriptions = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  event: v.string(),
  resource: v.optional(v.string()),
  externalId: v.optional(v.string()),
  cursor: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  functionId: v.optional(v.id("_scheduled_functions")),
  status: subscriptionStatus,
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_integration_event_resource", [
    "integrationId",
    "event",
    "resource",
  ])
  .index("by_tenant_and_status", ["tenantId", "status"])
