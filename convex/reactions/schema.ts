import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "../shared/actor"
import { integrationValidator } from "../shared/integrations"

export const reactionAction = v.union(v.literal("added"), v.literal("removed"))

export const reactionTarget = v.object({
  key: v.string(),
  conversationId: v.optional(v.string()),
  actor: v.optional(actorValidator),
  identifiers: v.array(v.string()),
  text: v.optional(v.string()),
})

export const reactions = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  integration: integrationValidator,
  target: reactionTarget,
  actor: v.optional(actorValidator),
  reaction: v.string(),
  removedAt: v.optional(v.number()),
  observedAt: v.number(),
  updatedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_integration_and_target_key", ["integrationId", "target.key"])
  .index("by_tenant_and_integration_and_target_conversation_and_updated", [
    "tenantId",
    "integrationId",
    "target.conversationId",
    "updatedAt",
  ])
