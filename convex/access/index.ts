import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { readOrganizationClaim } from "./users"

export async function requireOrganizationAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  organizationId: string
) {
  const access = await checkOrganizationAccess(ctx, organizationId)

  if (!access.ok) {
    throw new Error(access.message)
  }

  return access.identity
}

export async function checkOrganizationAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  organizationId: string
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    return {
      ok: false as const,
      message: "Sign in to access this organization.",
    }
  }

  const identityOrganizationId = readOrganizationClaim(identity)

  if (identityOrganizationId === undefined) {
    return {
      ok: false as const,
      message:
        "Your session has no active organization. Pick an organization and refresh.",
    }
  }

  if (identityOrganizationId !== organizationId) {
    return {
      ok: false as const,
      message:
        "This data belongs to another organization. Switch organizations or refresh your session.",
    }
  }

  return { ok: true as const, identity }
}
