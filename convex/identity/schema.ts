import { defineTable } from "convex/server"
import { v } from "convex/values"

export const identityProvider = v.union(
  v.literal("clerk"),
  v.literal("google"),
  v.literal("microsoft")
)

export const identities = defineTable({
  tenantId: v.string(),
  userId: v.string(),
  provider: identityProvider,
  externalId: v.string(),
  email: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant_email", ["tenantId", "email"])
  .index("by_tenant_provider_external_id", [
    "tenantId",
    "provider",
    "externalId",
  ])
  .index("by_tenant_provider_user", ["tenantId", "provider", "userId"])
