import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import {
  type Integration,
  integrationValidator,
  isGoogleIntegration,
  isUserScopedIntegration,
} from "../shared/integrations"
import { getTenantIntegration, getUserIntegrationForOwner } from "./data"
import { revokeIntegrationAccess } from "./revoke"

export const disconnect = action({
  args: {
    integration: integrationValidator,
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"integrations"> | null> => {
    const target: DisconnectTarget | null = await ctx.runQuery(
      internal.integrations.disconnect.getDisconnectTarget,
      args
    )

    if (target === null) {
      return null
    }

    const began: boolean = await ctx.runMutation(
      internal.integrations.disconnect.beginDisconnect,
      {
        credentials: target.integration.credentials,
        integrationId: target.integration._id,
      }
    )

    if (!began) {
      return null
    }

    try {
      await revokeIntegrationAccess(target.integration)
    } catch (error) {
      await ctx.runMutation(internal.integrations.disconnect.cancelDisconnect, {
        credentials: target.integration.credentials,
        integrationId: target.integration._id,
      })

      throw error
    }

    await ctx.runMutation(internal.integrations.disconnect.finishDisconnect, {
      credentials: target.integration.credentials,
      externalId: requireExternalId(target.integration),
      integrationId: target.integration._id,
      ownerId: target.integration.ownerId,
      integration: target.integration.integration,
      tenantId: target.integration.tenantId,
    })

    return target.integration._id
  },
})

export const getDisconnectTarget = internalQuery({
  args: {
    integration: integrationValidator,
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<DisconnectTarget | null> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const userId = requireClerkUserId(identity)
    const integration = isUserScopedIntegration(args.integration)
      ? await getUserIntegrationForOwner(ctx, {
          ownerId: userId,
          integration: args.integration,
          tenantId: args.tenantId,
        })
      : await getTenantIntegration(ctx, {
          integration: args.integration,
          tenantId: args.tenantId,
        })

    if (integration === null || integration.status !== "active") {
      return null
    }

    return { integration } satisfies DisconnectTarget
  },
})

export const beginDisconnect = internalMutation({
  args: {
    credentials: v.any(),
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (
      integration === null ||
      integration.status !== "active" ||
      !isSameSnapshot(integration.credentials, args.credentials)
    ) {
      return false
    }

    await ctx.db.patch(args.integrationId, {
      status: "paused",
      updatedAt: Date.now(),
    })

    return true
  },
})

export const cancelDisconnect = internalMutation({
  args: {
    credentials: v.any(),
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (
      integration !== null &&
      integration.status === "paused" &&
      isSameSnapshot(integration.credentials, args.credentials)
    ) {
      await ctx.db.patch(args.integrationId, {
        status: "active",
        updatedAt: Date.now(),
      })
    }
  },
})

export const finishDisconnect = internalMutation({
  args: {
    credentials: v.any(),
    externalId: v.string(),
    integrationId: v.id("integrations"),
    ownerId: v.optional(v.string()),
    integration: integrationValidator,
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    for (const integration of await getIntegrationsToDelete(ctx, args)) {
      await ctx.db.delete(integration._id)
    }
  },
})

type DisconnectTarget = {
  integration: Doc<"integrations">
}

async function getIntegrationsToDelete(
  ctx: MutationCtx,
  args: {
    credentials: unknown
    externalId: string
    integrationId: Id<"integrations">
    ownerId?: string | undefined
    integration: Integration
    tenantId: string
  }
) {
  const integration = await ctx.db.get(args.integrationId)

  if (integration === null) {
    return []
  }

  if (!isGoogleIntegration(args.integration)) {
    return integration.status === "paused" &&
      isSameSnapshot(integration.credentials, args.credentials)
      ? [integration]
      : []
  }

  const integrations = await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_status", (query) =>
      query.eq("tenantId", args.tenantId).eq("status", "active")
    )
    .collect()
  const pausedIntegrations = await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_status", (query) =>
      query.eq("tenantId", args.tenantId).eq("status", "paused")
    )
    .collect()

  return [...integrations, ...pausedIntegrations].filter(
    (candidate) =>
      isGoogleIntegration(candidate.integration) &&
      candidate.externalId === args.externalId &&
      candidate.ownerId === args.ownerId
  )
}

function requireExternalId(integration: Doc<"integrations">) {
  if (integration.externalId !== undefined) {
    return integration.externalId
  }

  throw new Error(
    `${integration.integration} integration is missing external ID`
  )
}

function isSameSnapshot(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}
