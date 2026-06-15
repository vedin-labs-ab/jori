import { defineTable } from "convex/server"
import { v } from "convex/values"
import { integrationValidator } from "../integrations/catalog"

const integrationScope = v.union(v.literal("tenant"), v.literal("user"))
const integrationStatus = v.union(v.literal("active"), v.literal("paused"))

export const integrations = defineTable({
  tenantId: v.string(),
  provider: integrationValidator,
  scope: integrationScope,
  ownerId: v.optional(v.string()),
  externalId: v.string(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  url: v.optional(v.string()),
  avatar: v.optional(v.string()),
  credentials: v.any(),
  status: integrationStatus,
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  data: v.optional(v.any()),
})
  .index("by_tenant_and_status", ["tenantId", "status"])
  .index("by_tenant_and_provider", ["tenantId", "provider"])
  .index("by_tenant_and_provider_and_owner", [
    "tenantId",
    "provider",
    "ownerId",
  ])
  .index("by_provider_and_external", ["provider", "externalId"])
  .index("by_tenant_and_provider_and_external", [
    "tenantId",
    "provider",
    "externalId",
  ])
