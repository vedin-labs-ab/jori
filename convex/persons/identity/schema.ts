import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { type Integration } from "../../shared/integrations"

export const identityProvider = v.union(
  v.literal("auth"),
  v.literal("email"),
  v.literal("github"),
  v.literal("google"),
  v.literal("linear"),
  v.literal("microsoft"),
  v.literal("notion"),
  v.literal("slack")
)

export type IdentityProvider = Infer<typeof identityProvider>

// The identity provider an integration's observed actors belong to;
// undefined for integrations whose actors are not person-shaped.
export function actorIdentityProvider(
  integration: Integration
): IdentityProvider | undefined {
  if (
    integration === "github" ||
    integration === "linear" ||
    integration === "notion" ||
    integration === "slack"
  ) {
    return integration
  }

  return undefined
}

const linkMethod = v.union(
  v.literal("observed"),
  v.literal("oauth"),
  v.literal("email"),
  v.literal("manual")
)

export type LinkMethod = Infer<typeof linkMethod>

// One-off US preservation bridge. Remove after migration:preserve succeeds.
const identityLink = v.union(
  v.object({
    method: linkMethod,
    at: v.number(),
    evidence: v.optional(v.string()),
  }),
  v.object({
    method: linkMethod,
    linkedAt: v.number(),
    evidence: v.optional(v.string()),
  })
)

export const identities = defineTable({
  organizationId: v.string(),
  personId: v.id("persons"),
  provider: identityProvider,
  externalId: v.string(),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  link: identityLink,
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization_email", ["organizationId", "email"])
  .index("by_organization_provider_external_id", [
    "organizationId",
    "provider",
    "externalId",
  ])
  .index("by_person", ["personId"])
