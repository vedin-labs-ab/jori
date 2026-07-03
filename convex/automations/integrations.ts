import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import {
  type Integration,
  integrationLabels,
  isUserScopedIntegration,
} from "../shared/integrations"

export { integrationLabels } from "../shared/integrations"

export async function findEventIntegration(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    ownerId: Id<"persons"> | undefined
    tenantId: string
  }
) {
  if (isUserScopedIntegration(args.integration) && args.ownerId !== undefined) {
    return await ctx.db
      .query("integrations")
      .withIndex("by_tenant_and_integration_and_owner", (query) =>
        query
          .eq("tenantId", args.tenantId)
          .eq("integration", args.integration)
          .eq("ownerId", args.ownerId)
      )
      .first()
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_integration", (query) =>
      query.eq("tenantId", args.tenantId).eq("integration", args.integration)
    )
    .first()
}

export async function resolveEventIntegration(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    createdBy: Id<"persons"> | undefined
    tenantId: string
  }
): Promise<Doc<"integrations">> {
  const integration = await findEventIntegration(ctx, {
    integration: args.integration,
    ownerId: args.createdBy,
    tenantId: args.tenantId,
  })

  if (integration === null || integration.status !== "active") {
    throw new Error(`${integrationLabels[args.integration]} is not connected.`)
  }

  return integration
}
