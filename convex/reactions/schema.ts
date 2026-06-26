import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "../shared/actor"
import { integrationValidator } from "../shared/integrations"

export const reactionAction = v.union(v.literal("added"), v.literal("removed"))

export const reactions = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  integration: integrationValidator,
  key: v.string(),
  action: reactionAction,
  reaction: v.string(),
  actor: v.optional(actorValidator),
  targetKey: v.string(),
  targetIdentifiers: v.array(v.string()),
  targetActor: v.optional(actorValidator),
  targetText: v.optional(v.string()),
  targetMessageId: v.optional(v.id("messages")),
  conversationId: v.optional(v.string()),
  observedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_integration_and_key", ["integrationId", "key"])
  .index("by_integration_and_target", [
    "integrationId",
    "targetKey",
    "createdAt",
  ])
  .index("by_conversation_and_created", [
    "tenantId",
    "integrationId",
    "conversationId",
    "createdAt",
  ])
