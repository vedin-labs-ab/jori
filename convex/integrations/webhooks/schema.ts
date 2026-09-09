import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"

export const webhookProvider = v.union(
  v.literal("github"),
  v.literal("slack"),
  v.literal("linear"),
  v.literal("notion")
)
export type WebhookProvider = Infer<typeof webhookProvider>

export const webhookDeliveries = defineTable({
  provider: webhookProvider,
  eventId: v.string(),
  integrationId: v.id("integrations"),
  organizationId: v.string(),
  payload: v.optional(v.any()),
  status: v.union(
    v.literal("queued"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("inactive")
  ),
  attempts: v.number(),
  dueAt: v.optional(v.number()),
  expiresAt: v.number(),
})
  .index("by_provider_and_event", ["provider", "eventId"])
  .index("by_dueAt", ["dueAt"])
  .index("by_expiresAt", ["expiresAt"])
  .index("by_status", ["status"])
