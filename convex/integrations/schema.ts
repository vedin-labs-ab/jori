import { defineTable } from "convex/server"
import { v } from "convex/values"
import { integrationValidator } from "../shared/integrations"

export const integrationInstalls = defineTable({
  organizationId: v.string(),
  identity: v.string(),
  sessionId: v.string(),
  expiresAt: v.number(),
}).index("by_expiresAt", ["expiresAt"])

const integrationScope = v.union(v.literal("organization"), v.literal("user"))
// Rows are never deleted: disconnect and expiry are status transitions, so
// jobs bound to an integration id heal when it is reconnected.
const integrationStatus = v.union(
  v.literal("active"),
  v.literal("disconnected"),
  v.literal("expired")
)

export const integrations = defineTable({
  organizationId: v.string(),
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
  .index("by_organization_and_status", ["organizationId", "status"])
  .index("by_organization_and_integration", ["organizationId", "integration"])
  .index("by_organization_and_integration_and_owner", [
    "organizationId",
    "integration",
    "ownerId",
  ])
  .index("by_integration_and_external", ["integration", "externalId"])
