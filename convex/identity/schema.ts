import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"

export const identityProvider = v.union(
  v.literal("clerk"),
  v.literal("email"),
  v.literal("github"),
  v.literal("google"),
  v.literal("linear"),
  v.literal("microsoft"),
  v.literal("notion"),
  v.literal("slack")
)

export type IdentityProvider = Infer<typeof identityProvider>

export const linkMethod = v.union(
  v.literal("observed"),
  v.literal("oauth"),
  v.literal("email"),
  v.literal("manual")
)

export type LinkMethod = Infer<typeof linkMethod>

const identityLink = v.object({
  method: linkMethod,
  linkedAt: v.number(),
  evidence: v.optional(v.string()),
})

export const identities = defineTable({
  tenantId: v.string(),
  personId: v.id("persons"),
  provider: identityProvider,
  externalId: v.string(),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  link: identityLink,
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant_email", ["tenantId", "email"])
  .index("by_tenant_provider_external_id", [
    "tenantId",
    "provider",
    "externalId",
  ])
  .index("by_person", ["personId"])
