import { type ObjectType, v } from "convex/values"
import { stableJson } from "../../../contracts/apps/json"
import { type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { sha256Hex } from "../../shared/crypto"
import { optionalNumber } from "../../shared/input"
import { appCacheKeyFields } from "../schema"

const minCacheTtlMs = 15 * 60 * 1000
const maxCacheTtlMs = 60 * 60 * 1000
const maxCacheValueBytes = 512 * 1024
const maintenanceLimit = 100

export type AppToolCacheOptions = {
  ttlMs: number
  forceRefresh: boolean
}

export type AppToolCacheKeyInput = {
  organizationId: string
  appId: Id<"apps">
  versionId: Id<"appVersions">
  personId: Id<"persons">
  surface: string
  tool: string
  integrationId?: Id<"integrations">
  args: Record<string, unknown>
}

export const read = internalMutation({
  args: {
    ...appCacheKeyFields,
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const document = await findCacheDocument(ctx, args)

    if (document === null) {
      return null
    }

    if (document.expiresAt <= args.now) {
      await ctx.db.delete(document._id)

      return null
    }

    return {
      value: document.value as unknown,
      expiresAt: document.expiresAt,
    }
  },
})

export const write = internalMutation({
  args: {
    ...appCacheKeyFields,
    value: v.any(),
    ttlMs: v.number(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    await deleteExpiredCacheDocuments(ctx, args.now)

    const document = await findCacheDocument(ctx, args)
    const expiresAt = args.now + clampCacheTtlMs(args.ttlMs)

    if (document === null) {
      await ctx.db.insert("appCaches", {
        organizationId: args.organizationId,
        appId: args.appId,
        versionId: args.versionId,
        personId: args.personId,
        surface: args.surface,
        tool: args.tool,
        integrationId: args.integrationId,
        cacheKey: args.cacheKey,
        value: args.value,
        expiresAt,
        createdAt: args.now,
        updatedAt: args.now,
      })

      return null
    }

    await ctx.db.patch(document._id, {
      value: args.value,
      expiresAt,
      updatedAt: args.now,
    })

    return null
  },
})

export const invalidate = internalMutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
    personId: v.id("persons"),
    surface: v.string(),
    integrationId: v.optional(v.id("integrations")),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("appCaches")
      .withIndex("by_app_and_person_and_surface", (index) =>
        index
          .eq("appId", args.appId)
          .eq("personId", args.personId)
          .eq("surface", args.surface)
      )
      .take(maintenanceLimit)

    for (const document of documents) {
      if (
        document.organizationId === args.organizationId &&
        (args.integrationId === undefined ||
          document.integrationId === args.integrationId)
      ) {
        await ctx.db.delete(document._id)
      }
    }

    return null
  },
})

export function normalizeAppToolCacheOptions(input: {
  ttlMs?: unknown
  forceRefresh?: unknown
}): AppToolCacheOptions {
  return {
    ttlMs: clampCacheTtlMs(optionalNumber(input.ttlMs)),
    forceRefresh: input.forceRefresh === true,
  }
}

export async function createAppToolCacheKey(input: AppToolCacheKeyInput) {
  return await sha256Hex(stableJson(input))
}

export function canStoreAppToolCacheValue(value: unknown) {
  const json = JSON.stringify(value)

  return (
    json !== undefined &&
    new TextEncoder().encode(json).byteLength <= maxCacheValueBytes
  )
}

async function findCacheDocument(
  ctx: MutationCtx,
  args: ObjectType<typeof appCacheKeyFields>
) {
  const document = await ctx.db
    .query("appCaches")
    .withIndex("by_app_and_key", (index) =>
      index.eq("appId", args.appId).eq("cacheKey", args.cacheKey)
    )
    .first()

  if (document === null) {
    return null
  }

  return document.organizationId === args.organizationId &&
    document.versionId === args.versionId &&
    document.personId === args.personId &&
    document.surface === args.surface &&
    document.tool === args.tool &&
    document.integrationId === args.integrationId
    ? document
    : null
}

async function deleteExpiredCacheDocuments(ctx: MutationCtx, now: number) {
  const documents = await ctx.db
    .query("appCaches")
    .withIndex("by_expires_at", (index) => index.lt("expiresAt", now))
    .take(maintenanceLimit)

  for (const document of documents) {
    await ctx.db.delete(document._id)
  }
}

function clampCacheTtlMs(value: number | undefined) {
  if (value === undefined) {
    return minCacheTtlMs
  }

  return Math.max(minCacheTtlMs, Math.min(maxCacheTtlMs, Math.trunc(value)))
}
