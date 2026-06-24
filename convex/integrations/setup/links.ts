import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { internalMutation, mutation } from "../../_generated/server"
import { requireTenantAccess } from "../../identity/access"
import { requireClerkUserId } from "../../identity/users"
import {
  createSignedInstallState,
  installPathForIntegration,
} from "../../providers/install"
import { integrationValidator } from "../../shared/integrations"
import { recordSetupLinkEvent } from "./events"
import {
  findSetupLinkByToken,
  normalizeSetupReturnUrl,
  setupLinkLocation,
  upsertSetupSourceIdentity,
} from "./helpers"
import { setupLinkDelivery, setupLinkSource } from "./schema"
import { createSetupToken, hashSetupToken } from "./tokens"
import {
  markSetupLinkConnected,
  markSetupLinkExpired,
  markSetupLinkFailed,
  patchAndRead,
  recordSetupLinkDelivery,
} from "./transition"

const setupLinkTtlMs = 30 * 60 * 1000

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    integration: integrationValidator,
    summary: v.string(),
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
    const expiresAt = now + setupLinkTtlMs
    const setupLinkId = await ctx.db.insert("setupLinks", {
      tenantId: args.tenantId,
      integration: args.integration,
      tokenHash: await hashSetupToken(token),
      status: "pending",
      summary: args.summary,
      source: args.source,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    const functionId = await ctx.scheduler.runAt(
      expiresAt,
      internal.integrations.setup.lifecycle.expire,
      { setupLinkId }
    )
    const link = await patchAndRead(ctx, setupLinkId, { functionId })

    if (link !== null) {
      await recordSetupLinkEvent(ctx, {
        link,
        type: "offer.created",
      })
    }

    return {
      setupLinkId,
      integration: args.integration,
      url: location.url,
      urlPath: location.urlPath,
      expiresAt,
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
    const link = await findSetupLinkByToken(ctx, args.token)

    if (link === null) {
      throw new Error("Setup link not found.")
    }

    const identity = await requireTenantAccess(ctx, link.tenantId)
    const userId = requireClerkUserId(identity)
    const now = Date.now()

    if (link.expiresAt <= now && link.status !== "connected") {
      await markSetupLinkExpired(ctx, link, now)
      throw new Error("This setup link has expired.")
    }

    if (link.claim !== undefined && link.claim.userId !== userId) {
      throw new Error("This setup link was already claimed by another user.")
    }

    await upsertSetupSourceIdentity(ctx, {
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
      await markSetupLinkConnected(ctx, link, {
        integrationId: args.integrationId,
        now,
      })

      return null
    }

    await markSetupLinkFailed(ctx, link, {
      error: args.error ?? "Provider authorization failed.",
      now,
    })

    return null
  },
})

export const recordDelivery = internalMutation({
  args: {
    setupLinkId: v.id("setupLinks"),
    delivery: setupLinkDelivery,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.setupLinkId)

    if (link === null) {
      return null
    }

    await recordSetupLinkDelivery(ctx, link, args.delivery)

    return null
  },
})
