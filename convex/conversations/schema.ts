import { defineTable } from "convex/server"
import { v } from "convex/values"

export const conversations = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  externalId: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  summary: v.optional(v.string()),
  summarizedAt: v.optional(v.number()),
  functionId: v.optional(v.id("_scheduled_functions")),
  summarizeAt: v.optional(v.number()),
}).index("by_tenant_and_integration_and_external", [
  "tenantId",
  "integrationId",
  "externalId",
])
