import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { checkTenantAccess } from "../identity/access"
import { getClerkUserId } from "../identity/users"
import { type Integration } from "../integrations/catalog"

type QueryLikeCtx = QueryCtx | MutationCtx

export async function getTenantIntegration(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    tenantId: string
  }
) {
  const access = await checkTenantAccess(ctx, args.tenantId)

  if (!access.ok) {
    return null
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_integration", (query) =>
      query.eq("tenantId", args.tenantId).eq("integration", args.integration)
    )
    .order("desc")
    .first()
}

export async function getUserIntegration(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
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
    integration: args.integration,
    tenantId: args.tenantId,
  })
}

export async function getUserIntegrationForOwner(
  ctx: QueryLikeCtx,
  args: {
    ownerId: string
    integration: Integration
    tenantId: string
  }
) {
  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_integration_and_owner", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("integration", args.integration)
        .eq("ownerId", args.ownerId)
    )
    .order("desc")
    .first()
}
