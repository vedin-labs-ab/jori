import { type MutationCtx, type QueryCtx } from "../_generated/server"

export async function requireTenantAccess(
  ctx: QueryCtx | MutationCtx,
  tenantId: string
) {
  const access = await checkTenantAccess(ctx, tenantId)

  if (!access.ok) {
    throw new Error(access.message)
  }

  return access.identity
}

export async function checkTenantAccess(
  ctx: QueryCtx | MutationCtx,
  tenantId: string
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    return {
      ok: false as const,
      message: "Unauthorized: sign in before accessing tenant data.",
    }
  }

  const identityTenantId = readIdentityTenantId(identity)

  if (identityTenantId === undefined) {
    return {
      ok: false as const,
      message:
        'Unauthorized: Convex auth token is missing the active Clerk organization. Add {"org_id":"{{org.id}}"} to the Clerk JWT template named "convex", then refresh your session.',
    }
  }

  if (identityTenantId !== tenantId) {
    return {
      ok: false as const,
      message:
        "Unauthorized: active Clerk organization does not match the requested tenant. Switch organizations or refresh your session.",
    }
  }

  return { ok: true as const, identity }
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
