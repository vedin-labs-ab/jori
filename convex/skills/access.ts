import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { readClerkOrganizationId } from "../identity/users"

export async function requireTenantAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  tenantId: string
) {
  const access = await checkTenantAccess(ctx, tenantId)

  if (!access.ok) {
    throw new Error(access.message)
  }

  return access.identity
}

export async function checkTenantAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  tenantId: string
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    return {
      ok: false as const,
      message: "Sign in to access this organization.",
    }
  }

  const identityTenantId = readClerkOrganizationId(identity)

  if (identityTenantId === undefined) {
    return {
      ok: false as const,
      message:
        'Unauthorized: Convex auth token is missing the active Clerk organization. Add {"org":"{{org.id}}"} to the Clerk JWT template named "convex", then refresh your session.',
    }
  }

  if (identityTenantId !== tenantId) {
    return {
      ok: false as const,
      message:
        "This data belongs to another organization. Switch organizations or refresh your session.",
    }
  }

  return { ok: true as const, identity }
}
