import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import {
  type Integration,
  integrationLabels,
  isUserScopedIntegration,
} from "../shared/integrations"

export { integrationLabels } from "../shared/integrations"

type QueryLikeCtx = MutationCtx | QueryCtx

export async function resolveEventIntegration(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    createdBy: string | undefined
    tenantId: string
  }
) {
  return await resolveIntegration(ctx, args)
}

async function resolveIntegration(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    createdBy: string | undefined
    tenantId: string
  }
): Promise<Doc<"integrations">> {
  const integration =
    isUserScopedIntegration(args.integration) && args.createdBy !== undefined
      ? await ctx.db
          .query("integrations")
          .withIndex("by_tenant_and_integration_and_owner", (query) =>
            query
              .eq("tenantId", args.tenantId)
              .eq("integration", args.integration)
              .eq("ownerId", args.createdBy)
          )
          .first()
      : await ctx.db
          .query("integrations")
          .withIndex("by_tenant_and_integration", (query) =>
            query
              .eq("tenantId", args.tenantId)
              .eq("integration", args.integration)
          )
          .first()

  if (integration === null || integration.status !== "active") {
    throw new Error(`${integrationLabels[args.integration]} is not connected.`)
  }

  return integration
}
