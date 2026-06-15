import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import {
  type Integration,
  integrationLabels,
  isUserScopedIntegration,
} from "../integrations/catalog"

export { integrationLabels } from "../integrations/catalog"

type QueryLikeCtx = MutationCtx | QueryCtx

export async function resolveEventIntegration(
  ctx: QueryLikeCtx,
  args: {
    provider: Integration
    createdBy: string | undefined
    tenantId: string
  }
) {
  return await resolveIntegration(ctx, args)
}

async function resolveIntegration(
  ctx: QueryLikeCtx,
  args: {
    provider: Integration
    createdBy: string | undefined
    tenantId: string
  }
): Promise<Doc<"integrations">> {
  const integration =
    isUserScopedIntegration(args.provider) && args.createdBy !== undefined
      ? await ctx.db
          .query("integrations")
          .withIndex("by_tenant_and_provider_and_owner", (query) =>
            query
              .eq("tenantId", args.tenantId)
              .eq("provider", args.provider)
              .eq("ownerId", args.createdBy)
          )
          .first()
      : await ctx.db
          .query("integrations")
          .withIndex("by_tenant_and_provider", (query) =>
            query.eq("tenantId", args.tenantId).eq("provider", args.provider)
          )
          .first()

  if (integration === null || integration.status !== "active") {
    throw new Error(`${integrationLabels[args.provider]} is not connected.`)
  }

  return integration
}
