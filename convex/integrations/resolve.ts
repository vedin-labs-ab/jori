import { type Doc, type Id } from "../_generated/dataModel"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../runs/principal"
import { type QueryLikeCtx } from "../shared/context"
import {
  type Integration,
  integrationLabels,
  isUserScopedIntegration,
} from "../shared/integrations"
import { getUserIntegrationForOwner } from "./data"

async function findIntegrationForOwner(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    ownerId: Id<"persons"> | undefined
    organizationId: string
  }
) {
  if (isUserScopedIntegration(args.integration) && args.ownerId !== undefined) {
    return await ctx.db
      .query("integrations")
      .withIndex("by_organization_and_integration_and_owner", (query) =>
        query
          .eq("organizationId", args.organizationId)
          .eq("integration", args.integration)
          .eq("ownerId", args.ownerId)
      )
      .first()
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_organization_and_integration", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("integration", args.integration)
    )
    .first()
}

export async function resolveIntegrationForOwner(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    ownerId: Id<"persons"> | undefined
    organizationId: string
  }
): Promise<Doc<"integrations">> {
  const integration = await findIntegrationForOwner(ctx, {
    integration: args.integration,
    ownerId: args.ownerId,
    organizationId: args.organizationId,
  })

  if (integration === null || integration.status !== "active") {
    throw new Error(`${integrationLabels[args.integration]} is not connected.`)
  }

  return integration
}

export async function findIntegrationForPrincipal(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    principal: ExecutionPrincipal
    organizationId: string
  }
) {
  if (!canPrincipalUseIntegration(args.principal, args.integration)) {
    return null
  }

  if (isUserScopedIntegration(args.integration)) {
    const ownerId = executionPrincipalPersonId(args.principal)

    if (ownerId === undefined) {
      return null
    }

    return await getUserIntegrationForOwner(ctx, {
      integration: args.integration,
      organizationId: args.organizationId,
      ownerId,
    })
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_organization_and_integration", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("integration", args.integration)
    )
    .filter((query) => query.eq(query.field("scope"), "organization"))
    .order("desc")
    .first()
}

export function canPrincipalUseIntegration(
  principal: ExecutionPrincipal,
  integration: Integration
) {
  return principal.kind === "person" || !isUserScopedIntegration(integration)
}

export async function resolveIntegrationForPrincipal(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    principal: ExecutionPrincipal
    organizationId: string
  }
): Promise<Doc<"integrations">> {
  const integration = await findIntegrationForPrincipal(ctx, args)

  if (integration === null || integration.status !== "active") {
    const qualifier =
      args.principal.kind === "organization" ? " for the organization" : ""
    throw new Error(
      `${integrationLabels[args.integration]} is not connected${qualifier}.`
    )
  }

  return integration
}
