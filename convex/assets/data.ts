import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
import { boundedNumber, optionalString } from "../shared/input"
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
    organizationId: v.string(),
    query: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = boundedNumber(args.limit, 25, 1, maxAssetSearchResults)
    const query = normalizeSearchText(args.query)
    const mimeType = normalizeSearchText(args.mimeType)
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_organization_and_created_at", (index) =>
        index.eq("organizationId", args.organizationId)
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

const organizationAssetArgs = {
  organizationId: v.string(),
  assetId: v.id("assets"),
}

export const read = internalQuery({
  args: organizationAssetArgs,
  handler: async (ctx, args) => {
    const asset = await getOrganizationAsset(ctx, args)

    return asset === null ? null : await summarizeAsset(ctx, asset)
  },
})

export const getForOrganization = internalQuery({
  args: organizationAssetArgs,
  handler: async (ctx, args) => await getOrganizationAsset(ctx, args),
})

async function getOrganizationAsset(
  ctx: QueryCtx,
  args: { organizationId: string; assetId: Id<"assets"> }
) {
  const asset = await ctx.db.get(args.assetId)

  return asset !== null && asset.organizationId === args.organizationId
    ? asset
    : null
}

function normalizeSearchText(value: string | undefined) {
  return optionalString(value)?.toLowerCase()
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
