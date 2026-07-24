import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { readOrganizationClaim } from "./users"

/**
 * The caller, with no organization scope.
 *
 * Nearly every surface scopes to an organization, and should. This is for the
 * few a signed-in person reaches before they belong to one, where their own
 * identity is the entire scope of what they can be told.
 */
export async function requireIdentity(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new Error("Sign in to continue.")
  }

  return identity
}

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
