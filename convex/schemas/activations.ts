import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "./actors"

export const activations = defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  integrationId: v.id("integrations"),
  conversationId: v.string(),
  createdBy: v.optional(actorValidator),
  createdAt: v.number(),
}).index("by_conversation", ["tenantId", "integrationId", "conversationId"])
