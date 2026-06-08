import { defineTable } from "convex/server"
import { v } from "convex/values"

export const integrations = defineTable({
  tenantId: v.string(),
  provider: v.string(),
  externalAccountId: v.string(),
  credentials: v.any(),
  status: v.union(
    v.literal("active"),
    v.literal("paused"),
    v.literal("revoked")
  ),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  data: v.optional(v.any()),
})
  .index("by_tenant_provider", ["tenantId", "provider"])
  .index("by_provider_external_account", ["provider", "externalAccountId"])
