import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { requireClerkUserId } from "../identity/users"
import {
  type IntegrationProvider,
  integrationProviderValidator,
} from "../providers/catalog"
import { requireTenantAccess } from "../skills/access"
import { getTenantIntegration, getUserIntegrationForOwner } from "./data"
import { revokeIntegrationAccess } from "./revoke"

export const disconnect = action({
  args: {
    provider: integrationProviderValidator,
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

    const revokedAt = Date.now()

    await ctx.runMutation(internal.integrations.disconnect.finishDisconnect, {
      accountId: target.integration.accountId,
      credentials: target.integration.credentials,
      integrationId: target.integration._id,
      ownerId: target.integration.ownerId,
      provider: target.integration.provider,
      revokedAt,
      tenantId: target.integration.tenantId,
    })

    return target.integration._id
  },
})

export const getDisconnectTarget = internalQuery({
  args: {
    provider: integrationProviderValidator,
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<DisconnectTarget | null> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const userId = requireClerkUserId(identity)
    const integration = isUserScopedProvider(args.provider)
      ? await getUserIntegrationForOwner(ctx, {
          ownerId: userId,
          provider: args.provider,
          tenantId: args.tenantId,
        })
      : await getTenantIntegration(ctx, {
          provider: args.provider,
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

    await ctx.db.patch(args.integrationId, { status: "paused" })

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
      await ctx.db.patch(args.integrationId, { status: "active" })
    }
  },
})

export const finishDisconnect = internalMutation({
  args: {
    accountId: v.string(),
    credentials: v.any(),
    integrationId: v.id("integrations"),
    ownerId: v.optional(v.string()),
    provider: integrationProviderValidator,
    revokedAt: v.number(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    for (const integration of await getIntegrationsToRevoke(ctx, args)) {
      await ctx.db.patch(integration._id, {
        credentials: { revokedAt: args.revokedAt },
        status: "revoked",
      })
    }
  },
})

type DisconnectTarget = {
  integration: Doc<"integrations">
}

function isUserScopedProvider(provider: IntegrationProvider) {
  return (
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "microsoftCalendar" ||
    provider === "microsoftEmail"
  )
}

async function getIntegrationsToRevoke(
  ctx: MutationCtx,
  args: {
    accountId: string
    credentials: unknown
    integrationId: Id<"integrations">
    ownerId?: string | undefined
    provider: IntegrationProvider
    tenantId: string
  }
) {
  const integration = await ctx.db.get(args.integrationId)

  if (integration === null) {
    return []
  }

  if (!isGoogleProvider(args.provider)) {
    return integration.status === "paused" &&
      isSameSnapshot(integration.credentials, args.credentials)
      ? [integration]
      : []
  }

  const integrations = await ctx.db
    .query("integrations")
    .withIndex("by_tenant_status", (query) =>
      query.eq("tenantId", args.tenantId).eq("status", "active")
    )
    .collect()
  const pausedIntegrations = await ctx.db
    .query("integrations")
    .withIndex("by_tenant_status", (query) =>
      query.eq("tenantId", args.tenantId).eq("status", "paused")
    )
    .collect()

  return [...integrations, ...pausedIntegrations].filter(
    (candidate) =>
      isGoogleProvider(candidate.provider) &&
      candidate.accountId === args.accountId &&
      candidate.ownerId === args.ownerId
  )
}

function isGoogleProvider(provider: IntegrationProvider) {
  return provider === "gmail" || provider === "googleCalendar"
}

function isSameSnapshot(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}
