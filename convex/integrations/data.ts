import { type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { checkTenantAccess } from "../identity/access"
import { resolveCurrentPerson } from "../persons/clerk"
import { type Integration } from "../shared/integrations"

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
  ctx: QueryCtx,
  args: {
    integration: Integration
    tenantId: string
  }
) {
  const access = await checkTenantAccess(ctx, args.tenantId)

  if (!access.ok) {
    return null
  }

  const ownerId = await resolveCurrentPerson(ctx, args.tenantId).catch(
    () => undefined
  )

  if (ownerId === undefined) {
    return null
  }

  return await getUserIntegrationForOwner(ctx, {
    ownerId,
    integration: args.integration,
    tenantId: args.tenantId,
  })
}

export async function getUserIntegrationForOwner(
  ctx: QueryLikeCtx,
  args: {
    ownerId: Id<"persons">
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

export async function listActiveIntegrationsForOwner(
  ctx: QueryLikeCtx,
  args: {
    tenantId: string
    ownerId?: Id<"persons"> | undefined
  }
) {
  const integrations = await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_status", (query) =>
      query.eq("tenantId", args.tenantId).eq("status", "active")
    )
    .take(200)

  return integrations.filter((integration) => {
    if (integration.scope !== "user") {
      return true
    }

    return args.ownerId !== undefined && integration.ownerId === args.ownerId
  })
}
