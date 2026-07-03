import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
import { assetFields } from "./schema"

const maxAssetSearchResults = 100
const maxAssetsScanned = 500

export const record = internalMutation({
  args: assetFields,
  handler: async (ctx, args) => {
    return await ctx.db.insert("assets", {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const search = internalQuery({
  args: {
    tenantId: v.string(),
    query: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit)
    const query = normalizeSearchText(args.query)
    const mimeType = normalizeSearchText(args.mimeType)
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_tenant_and_created_at", (index) =>
        index.eq("tenantId", args.tenantId)
      )
      .order("desc")
      .take(maxAssetsScanned)
    const matches = assets
      .filter(
        (asset) =>
          matchesQuery(asset, query) && matchesMimeType(asset, mimeType)
      )
      .slice(0, limit)

    return await Promise.all(
      matches.map(async (asset) => await summarizeAsset(ctx, asset))
    )
  },
})

export const read = internalQuery({
  args: {
    tenantId: v.string(),
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId)

    if (asset === null || asset.tenantId !== args.tenantId) {
      return null
    }

    return await summarizeAsset(ctx, asset)
  },
})

export const getForTenant = internalQuery({
  args: {
    tenantId: v.string(),
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId)

    if (asset === null || asset.tenantId !== args.tenantId) {
      return null
    }

    return asset
  },
})

export const getForRun = internalQuery({
  args: {
    assetId: v.id("assets"),
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId)

    if (asset === null || asset.runId !== args.runId) {
      return null
    }

    return asset
  },
})

function normalizeLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 25
  }

  return Math.max(1, Math.min(maxAssetSearchResults, Math.trunc(value)))
}

function normalizeSearchText(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()

  return normalized === "" ? undefined : normalized
}

function matchesQuery(asset: Doc<"assets">, query: string | undefined) {
  if (query === undefined) {
    return true
  }

  return [asset.name, asset.description, asset.mimeType].some(
    (value) => value?.toLowerCase().includes(query) === true
  )
}

function matchesMimeType(asset: Doc<"assets">, mimeType: string | undefined) {
  if (mimeType === undefined) {
    return true
  }

  const assetMimeType = asset.mimeType.toLowerCase()

  return mimeType.endsWith("/")
    ? assetMimeType.startsWith(mimeType)
    : assetMimeType === mimeType
}

async function summarizeAsset(ctx: QueryCtx, asset: Doc<"assets">) {
  return {
    assetId: asset._id,
    name: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
    createdAt: asset.createdAt,
    url: await ctx.storage.getUrl(asset.storageId),
    ...(asset.description === undefined
      ? {}
      : { description: asset.description }),
  }
}
