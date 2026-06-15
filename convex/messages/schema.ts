import { defineTable } from "convex/server"
import { v } from "convex/values"
import { integrationProviderValidator } from "../providers/catalog"
import { actorValidator } from "../shared/actor"
import { sourceMetadataValidator } from "../shared/sources/schema"

export const messages = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  provider: integrationProviderValidator,
  type: v.string(),
  externalId: v.string(),
  actor: v.optional(actorValidator),
  conversationId: v.optional(v.string()),
  text: v.optional(v.string()),
  data: v.optional(v.any()),
  metadata: sourceMetadataValidator,
  observedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_external_id", ["externalId"])
  .index("by_conversation", ["tenantId", "integrationId", "conversationId"])
