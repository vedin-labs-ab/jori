import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { checkTenantAccess } from "../identity/access"
import { getClerkUserId } from "../identity/users"
import { type IntegrationProvider } from "../providers/catalog"

type QueryLikeCtx = QueryCtx | MutationCtx

export async function getTenantIntegration(
  ctx: QueryLikeCtx,
  args: {
    provider: IntegrationProvider
    tenantId: string
  }
) {
  const access = await checkTenantAccess(ctx, args.tenantId)

  if (!access.ok) {
    return null
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_provider", (query) =>
      query.eq("tenantId", args.tenantId).eq("provider", args.provider)
    )
    .order("desc")
    .first()
}

export async function getUserIntegration(
  ctx: QueryLikeCtx,
  args: {
    provider: IntegrationProvider
    tenantId: string
  }
) {
  const access = await checkTenantAccess(ctx, args.tenantId)

  if (!access.ok) {
    return null
  }

  const userId = getClerkUserId(access.identity)

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
    provider: IntegrationProvider
    tenantId: string
  }
) {
  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_provider_and_owner", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("provider", args.provider)
        .eq("ownerId", args.ownerId)
    )
    .order("desc")
    .first()
}
