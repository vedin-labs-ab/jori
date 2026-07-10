import { defineTable } from "convex/server"
import { v } from "convex/values"
import { integrationValidator } from "../shared/integrations"

const integrationScope = v.union(v.literal("tenant"), v.literal("user"))
// Rows are never deleted: disconnect and expiry are status transitions, so
// automations bound to an integration id heal when it is reconnected.
const integrationStatus = v.union(
  v.literal("active"),
  v.literal("disconnected"),
  v.literal("expired")
)

export const integrations = defineTable({
  tenantId: v.string(),
  integration: integrationValidator,
  scope: integrationScope,
  ownerId: v.optional(v.id("persons")),
  externalId: v.string(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  url: v.optional(v.string()),
  avatar: v.optional(v.string()),
  credentials: v.any(),
  status: integrationStatus,
  createdBy: v.id("persons"),
  createdAt: v.number(),
  updatedAt: v.number(),
  data: v.optional(v.any()),
})
  .index("by_tenant_and_status", ["tenantId", "status"])
  .index("by_tenant_and_integration", ["tenantId", "integration"])
  .index("by_tenant_and_integration_and_owner", [
    "tenantId",
    "integration",
    "ownerId",
  ])
  .index("by_integration_and_external", ["integration", "externalId"])
  .index("by_tenant_and_integration_and_external", [
    "tenantId",
    "integration",
    "externalId",
  ])
