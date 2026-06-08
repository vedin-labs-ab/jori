import { defineTable } from "convex/server"
import { v } from "convex/values"

export const integrations = defineTable({
  tenantId: v.string(),
  provider: v.literal("slack"),
  accountId: v.string(),
  tokenId: v.string(),
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
  .index("by_provider_account", ["provider", "accountId"])
