import { defineTable } from "convex/server"
import { v } from "convex/values"
import { integrationProviderValidator } from "../providers/catalog"

export const integrations = defineTable({
  tenantId: v.string(),
  provider: integrationProviderValidator,
  scope: v.optional(v.union(v.literal("tenant"), v.literal("user"))),
  ownerId: v.optional(v.string()),
  accountId: v.string(),
  credentials: v.any(),
  status: v.union(
    v.literal("active"),
    v.literal("paused"),
    v.literal("revoked")
  ),
  createdByUserId: v.optional(v.string()),
  createdAt: v.number(),
  data: v.optional(v.any()),
})
  .index("by_tenant_status", ["tenantId", "status"])
  .index("by_tenant_provider", ["tenantId", "provider"])
  .index("by_tenant_provider_owner", ["tenantId", "provider", "ownerId"])
  .index("by_provider_account", ["provider", "accountId"])
