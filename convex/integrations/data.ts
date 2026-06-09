import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { getClerkUserId } from "../identity/users"

type QueryLikeCtx = QueryCtx | MutationCtx

export async function getTenantIntegration(
  ctx: QueryLikeCtx,
  args: {
    provider: string
    tenantId: string
  }
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    return null
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_provider", (query) =>
      query.eq("tenantId", args.tenantId).eq("provider", args.provider)
    )
    .order("desc")
    .first()
}

export async function getUserIntegration(
  ctx: QueryLikeCtx,
  args: {
    provider: string
    tenantId: string
  }
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    return null
  }

  const userId = getClerkUserId(identity)

  if (userId === undefined) {
    return null
  }

  return await getUserIntegrationForOwner(ctx, {
    ownerId: userId,
    provider: args.provider,
    tenantId: args.tenantId,
  })
}

export async function getUserIntegrationForOwner(
  ctx: QueryLikeCtx,
  args: {
    ownerId: string
    provider: string
    tenantId: string
  }
) {
  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_provider_owner", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("provider", args.provider)
        .eq("ownerId", args.ownerId)
    )
    .order("desc")
    .first()
}
