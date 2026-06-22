import { v } from "convex/values"
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { requireTenantAccess } from "../../identity/access"
import { upsertIdentity } from "../../identity/identities"
import { requireClerkUserId } from "../../identity/users"
import {
  createSignedInstallState,
  installPathForIntegration,
} from "../../providers/install"
import { readAppOrigin } from "../../shared/app"
import { integrationValidator } from "../../shared/integrations"
import { type SetupLinkSource, setupLinkSource } from "./schema"
import { surfaceIdentityProvider } from "./source"
import { createSetupToken, hashSetupToken } from "./tokens"

const setupLinkTtlMs = 30 * 60 * 1000

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    integration: integrationValidator,
    source: setupLinkSource,
  },
  returns: v.object({
    setupLinkId: v.id("setupLinks"),
    integration: integrationValidator,
    url: v.string(),
    urlPath: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const token = createSetupToken()
    const location = setupLinkLocation(token)
    const now = Date.now()
    const setupLinkId = await ctx.db.insert("setupLinks", {
      tenantId: args.tenantId,
      integration: args.integration,
      tokenHash: await hashSetupToken(token),
      status: "pending",
      source: args.source,
      expiresAt: now + setupLinkTtlMs,
      createdAt: now,
      updatedAt: now,
    })

    return {
      setupLinkId,
      integration: args.integration,
      url: location.url,
      urlPath: location.urlPath,
      expiresAt: now + setupLinkTtlMs,
    }
  },
})

export const claim = mutation({
  args: {
    token: v.string(),
    returnUrl: v.string(),
  },
  returns: v.union(
    v.object({
      status: v.literal("ready"),
      integration: integrationValidator,
      installPath: v.string(),
      state: v.string(),
      expiresAt: v.number(),
    }),
    v.object({
      status: v.literal("connected"),
      integration: integrationValidator,
      integrationId: v.optional(v.id("integrations")),
    })
  ),
  handler: async (ctx, args) => {
    const link = await findByToken(ctx, args.token)

    if (link === null) {
      throw new Error("Setup link not found.")
    }

    const identity = await requireTenantAccess(ctx, link.tenantId)
    const userId = requireClerkUserId(identity)
    const now = Date.now()

    if (link.expiresAt <= now && link.status !== "connected") {
      throw new Error("This setup link has expired.")
    }

    if (link.claim !== undefined && link.claim.userId !== userId) {
      throw new Error("This setup link was already claimed by another user.")
    }

    await upsertSourceIdentity(ctx, {
      tenantId: link.tenantId,
      userId,
      source: link.source,
    })

    if (link.status === "connected") {
      return {
        status: "connected" as const,
        integration: link.integration,
        ...(link.result?.integrationId === undefined
          ? {}
          : { integrationId: link.result.integrationId }),
      }
    }

    await ctx.db.patch(link._id, {
      status: "claimed",
      claim: link.claim ?? { userId, at: now },
      result: undefined,
      updatedAt: now,
    })

    const returnUrl = normalizeSetupReturnUrl(args.returnUrl)
    const state = await createSignedInstallState(ctx, link.integration, {
      tenantId: link.tenantId,
      returnUrl,
      setupLinkId: link._id,
    })

    return {
      status: "ready" as const,
      integration: link.integration,
      installPath: installPathForIntegration(link.integration),
      state,
      expiresAt: link.expiresAt,
    }
  },
})

export const complete = internalMutation({
  args: {
    setupLinkId: v.optional(v.id("setupLinks")),
    integrationId: v.optional(v.id("integrations")),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.setupLinkId === undefined) {
      return null
    }

    const link = await ctx.db.get(args.setupLinkId)

    if (link === null) {
      return null
    }

    const now = Date.now()

    if (args.integrationId !== undefined) {
      await ctx.db.patch(link._id, {
        status: "connected",
        result: { integrationId: args.integrationId },
        updatedAt: now,
      })

      return null
    }

    await ctx.db.patch(link._id, {
      status: "failed",
      result: {
        error: args.error ?? "Provider authorization failed.",
      },
      updatedAt: now,
    })

    return null
  },
})

function setupLinkLocation(token: string) {
  const urlPath = `/integrations/setup/${encodeURIComponent(token)}`
  const origin = requireAppOrigin()

  return {
    url: new URL(urlPath, origin).toString(),
    urlPath,
  }
}

async function findByToken(ctx: MutationCtx, token: string) {
  const tokenHash = await hashSetupToken(token)

  return await ctx.db
    .query("setupLinks")
    .withIndex("by_token_hash", (query) => query.eq("tokenHash", tokenHash))
    .first()
}

async function upsertSourceIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    userId: string
    source: SetupLinkSource
  }
) {
  const provider = surfaceIdentityProvider(args.source.surface)
  const actor = args.source.actor

  if (provider === undefined || actor === undefined) {
    return
  }

  await upsertIdentity(ctx, {
    tenantId: args.tenantId,
    userId: args.userId,
    provider,
    externalId: actor.externalId,
    email: actor.email,
    name: actor.name,
  })
}

function normalizeSetupReturnUrl(returnUrl: string) {
  let url: URL

  try {
    url = new URL(returnUrl)
  } catch {
    throw new Error("Setup return URL must be absolute.")
  }

  if (
    url.origin !== requireAppOrigin() ||
    !url.pathname.startsWith("/integrations/setup/")
  ) {
    throw new Error("Setup return URL must point to a Milo setup link.")
  }

  url.search = ""
  url.hash = ""

  return url.toString()
}

function requireAppOrigin() {
  const origin = readAppOrigin()

  if (origin === undefined) {
    throw new Error("MILO_APP_URL must be configured to create setup links.")
  }

  return origin
}
