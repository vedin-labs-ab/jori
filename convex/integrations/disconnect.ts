import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { resolveCurrentPerson } from "../persons/account"
import {
  type Integration,
  integrations,
  integrationValidator,
  isGoogleIntegration,
  isUserScopedIntegration,
} from "../shared/integrations"
import { getOrganizationIntegration, getUserIntegrationForOwner } from "./data"
import { revokeIntegrationAccess } from "./revoke"

export const disconnect = action({
  args: {
    integration: integrationValidator,
    organizationId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"integrations"> | null> => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const target: Doc<"integrations"> | null = await ctx.runQuery(
      internal.integrations.disconnect.getDisconnectTarget,
      args
    )

    if (target === null) {
      return null
    }

    const began: boolean = await ctx.runMutation(
      internal.integrations.disconnect.beginDisconnect,
      {
        credentials: target.credentials,
        integrationId: target._id,
      }
    )

    if (!began) {
      return null
    }

    try {
      await revokeIntegrationAccess(target)
    } catch (error) {
      await ctx.runMutation(internal.integrations.disconnect.cancelDisconnect, {
        credentials: target.credentials,
        integrationId: target._id,
      })

      throw error
    }

    await ctx.runMutation(internal.integrations.disconnect.finishDisconnect, {
      externalId: requireExternalId(target),
      ownerId: target.ownerId,
      integration: target.integration,
      organizationId: target.organizationId,
    })

    return target._id
  },
})

export const getDisconnectTarget = internalQuery({
  args: {
    integration: integrationValidator,
    organizationId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"integrations"> | null> => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const integration = isUserScopedIntegration(args.integration)
      ? await getUserIntegrationForOwner(ctx, {
          ownerId: personId,
          integration: args.integration,
          organizationId: args.organizationId,
        })
      : await getOrganizationIntegration(ctx, {
          integration: args.integration,
          organizationId: args.organizationId,
        })

    if (integration === null || integration.status !== "active") {
      return null
    }

    return integration
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
      status: "disconnected",
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
      integration.status === "disconnected" &&
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
    externalId: v.string(),
    ownerId: v.optional(v.id("persons")),
    integration: integrationValidator,
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    for (const integration of await listLinkedGoogleIntegrations(ctx, args)) {
      await ctx.db.patch(integration._id, {
        status: "disconnected",
        updatedAt: Date.now(),
      })
    }
  },
})

/**
 * Google integrations share one OAuth grant per account, so revoking one
 * integration's token kills the others' tokens too; disconnect them together.
 */
async function listLinkedGoogleIntegrations(
  ctx: MutationCtx,
  args: {
    externalId: string
    ownerId?: Id<"persons"> | undefined
    integration: Integration
    organizationId: string
  }
) {
  if (!isGoogleIntegration(args.integration) || args.ownerId === undefined) {
    return []
  }

  const linked: Doc<"integrations">[] = []

  for (const integration of integrations.filter(isGoogleIntegration)) {
    const candidate = await getUserIntegrationForOwner(ctx, {
      ownerId: args.ownerId,
      integration,
      organizationId: args.organizationId,
    })

    if (
      candidate !== null &&
      candidate.status !== "disconnected" &&
      candidate.externalId === args.externalId
    ) {
      linked.push(candidate)
    }
  }

  return linked
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
