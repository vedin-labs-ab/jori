import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "../shared/actor"
import { integrationValidator } from "../shared/integrations"

export const reactionAction = v.union(v.literal("added"), v.literal("removed"))

export const reactions = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  integration: integrationValidator,
  conversationId: v.optional(v.string()),
  targetKey: v.string(),
  targetMessageId: v.optional(v.id("messages")),
  targetActor: v.optional(actorValidator),
  targetIdentifiers: v.array(v.string()),
  targetText: v.optional(v.string()),
  actor: v.optional(actorValidator),
  actorKey: v.string(),
  reaction: v.string(),
  removedAt: v.optional(v.number()),
  observedAt: v.optional(v.number()),
  updatedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_integration_and_target", ["integrationId", "targetKey"])
  .index("by_conversation_and_updated", [
    "tenantId",
    "integrationId",
    "conversationId",
    "updatedAt",
  ])
