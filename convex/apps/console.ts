import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { mutation, type QueryCtx, query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { listAppAutomationRoots } from "../automations/lifecycle/read"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { personDisplayName } from "../persons/names"
import { findAccessibleApp, getAccessibleApp, searchApps } from "./access"
import {
  summarizeAutomations,
  summarizeCapabilities,
  summarizeVersion,
  templateProvenance,
} from "./summary"

export const list = query({
  args: {
    organizationId: v.string(),
    query: v.string(),
    includeArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        apps: [],
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const apps = await searchApps(ctx, {
      organizationId: args.organizationId,
      personId,
      query: args.query,
      includeArchived: args.includeArchived,
      limit: 100,
    })

    return {
      status: "ready" as const,
      apps: await Promise.all(
        apps.map(async (app) => await summarizeForConsole(ctx, app))
      ),
    }
  },
})

export const get = query({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        app: null,
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const app = await findAccessibleApp(ctx, { ...args, personId })

    if (app === null) {
      return {
        status: "not_found" as const,
        app: null,
      }
    }

    return {
      status: "ready" as const,
      app: await summarizeForConsole(ctx, app),
    }
  },
})

/** Expiration order is also lifecycle order: every future expiry sorts ahead
 *  of every past expiry, so one indexed cursor yields active links first. */
export const pageShares = query({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    await getAccessibleApp(ctx, { ...args, personId })

    const result = await ctx.db
      .query("appShares")
      .withIndex("by_app_and_expires_at", (index) =>
        index.eq("appId", args.appId)
      )
      .order("desc")
      .paginate(args.paginationOpts)

    return {
      ...result,
      page: result.page.map((share) => ({
        shareId: share._id,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
      })),
    }
  },
})

export const remove = mutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    appId: Id<"apps">
    archived?: true
    deleted?: true
  }> => {
    await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.apps.records.remove, args)
  },
})

export const restore = mutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ appId: Id<"apps">; restored: true }> => {
    await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.apps.records.restore, args)
  },
})

export const revokeShare = mutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
    shareId: v.id("appShares"),
  },
  handler: async (ctx, args): Promise<null> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    await ctx.runMutation(internal.apps.serve.share.revoke, {
      ...args,
      personId,
    })

    return null
  },
})

async function summarizeForConsole(ctx: QueryCtx, app: Doc<"apps">) {
  const versions = await ctx.db
    .query("appVersions")
    .withIndex("by_app", (index) => index.eq("appId", app._id))
    .order("desc")
    .take(20)
  const automations = await listAppAutomationRoots(ctx, app._id, 20)
  const capabilities = await ctx.db
    .query("appTools")
    .withIndex("by_app", (index) => index.eq("appId", app._id))
    .take(50)

  return {
    appId: app._id,
    title: app.title,
    access: app.access,
    ownerId: app.ownerId,
    ownerName: await personDisplayName(ctx, app.ownerId),
    versionId: app.versionId,
    contract: app.contract,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    archivedAt: app.archivedAt,
    lastOpenedAt: await lastOpenedAt(ctx, app._id),
    template: templateProvenance(versions, app.versionId),
    versions: versions.map((version) =>
      summarizeVersion(version, app.versionId)
    ),
    automations: summarizeAutomations(automations),
    capabilities: summarizeCapabilities(capabilities),
  }
}

async function lastOpenedAt(ctx: QueryCtx, appId: Id<"apps">) {
  const latestSession = await ctx.db
    .query("appSessions")
    .withIndex("by_app_and_seen_at", (index) => index.eq("appId", appId))
    .order("desc")
    .first()

  return latestSession?.seenAt
}
