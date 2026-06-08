import { type MutationCtx, type QueryCtx } from "../_generated/server"

export async function requireTenantAccess(
  ctx: QueryCtx | MutationCtx,
  tenantId: string
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new Error("Unauthorized")
  }

  if (readIdentityTenantId(identity) !== tenantId) {
    throw new Error("Unauthorized")
  }

  return identity
}

function readIdentityTenantId(identity: Record<string, unknown>) {
  const candidates = [
    readNestedIdentityString(identity, "o", "id"),
    identity["o.id"],
    identity.orgId,
    identity.org_id,
    identity.organizationId,
    identity.organization_id,
    identity["https://clerk.com/org_id"],
  ]

  return candidates.find((candidate) => typeof candidate === "string")
}

function readNestedIdentityString(
  identity: Record<string, unknown>,
  key: string,
  nestedKey: string
) {
  const value = identity[key]

  if (typeof value !== "object" || value === null) {
    return undefined
  }

  const nestedValue = (value as Record<string, unknown>)[nestedKey]

  return typeof nestedValue === "string" ? nestedValue : undefined
}
