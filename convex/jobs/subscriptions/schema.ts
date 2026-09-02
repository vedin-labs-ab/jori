import { defineTable } from "convex/server"
import { v } from "convex/values"
import { eventMatch } from "../../events/schema"

const subscriptionStatus = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("failed")
)

export const subscriptions = defineTable({
  organizationId: v.string(),
  integrationId: v.id("integrations"),
  event: v.string(),
  match: v.optional(eventMatch),
  matchKey: v.optional(v.string()),
  externalId: v.optional(v.string()),
  cursor: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  functionId: v.optional(v.id("_scheduled_functions")),
  status: subscriptionStatus,
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_integration_event_match", ["integrationId", "event", "matchKey"])
