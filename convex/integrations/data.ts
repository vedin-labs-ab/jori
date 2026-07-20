import { type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { resolveCurrentPerson } from "../persons/account"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../runs/principal"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration } from "../shared/integrations"

export async function findIntegrationByExternalId(
  ctx: QueryLikeCtx,
  args: {
    externalId: string
    integration: Integration
  }
) {
  return await ctx.db
    .query("integrations")
    .withIndex("by_integration_and_external", (query) =>
      query
        .eq("integration", args.integration)
        .eq("externalId", args.externalId)
    )
    .first()
}

export async function findActiveIntegrationByExternalId(
  ctx: QueryLikeCtx,
  args: {
    externalId: string
    integration: Integration
  }
) {
  const integration = await findIntegrationByExternalId(ctx, args)

  return integration === null || integration.status !== "active"
    ? null
    : integration
}

export async function getOrganizationIntegration(
  ctx: QueryLikeCtx,
  args: {
    integration: Integration
    organizationId: string
  }
) {
  const access = await checkOrganizationAccess(ctx, args.organizationId)

  if (!access.ok) {
    return null
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_organization_and_integration", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("integration", args.integration)
    )
    .order("desc")
    .first()
}

export async function getUserIntegration(
  ctx: QueryCtx,
  args: {
    integration: Integration
    organizationId: string
  }
) {
  const access = await checkOrganizationAccess(ctx, args.organizationId)

  if (!access.ok) {
    return null
  }

  const ownerId = await resolveCurrentPerson(ctx, args.organizationId).catch(
    () => undefined
  )

  if (ownerId === undefined) {
    return null
  }

  return await getUserIntegrationForOwner(ctx, {
    ownerId,
    integration: args.integration,
    organizationId: args.organizationId,
  })
}

export async function getUserIntegrationForOwner(
  ctx: QueryLikeCtx,
  args: {
    ownerId: Id<"persons">
    integration: Integration
    organizationId: string
  }
) {
  return await ctx.db
    .query("integrations")
    .withIndex("by_organization_and_integration_and_owner", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("integration", args.integration)
        .eq("ownerId", args.ownerId)
    )
    .order("desc")
    .first()
}

export async function listActiveIntegrationsForOwner(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    ownerId?: Id<"persons"> | undefined
  }
) {
  const integrations = await ctx.db
    .query("integrations")
    .withIndex("by_organization_and_status", (query) =>
      query.eq("organizationId", args.organizationId).eq("status", "active")
    )
    .take(200)

  return integrations.filter((integration) => {
    if (integration.scope !== "user") {
      return true
    }

    return args.ownerId !== undefined && integration.ownerId === args.ownerId
  })
}

export async function listActiveIntegrationsForPrincipal(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    principal: ExecutionPrincipal
  }
) {
  return await listActiveIntegrationsForOwner(ctx, {
    organizationId: args.organizationId,
    ownerId: executionPrincipalPersonId(args.principal),
  })
}
