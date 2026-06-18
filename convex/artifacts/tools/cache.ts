import { v } from "convex/values"
import { type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"

const minCacheTtlMs = 15 * 60 * 1000
const maxCacheTtlMs = 60 * 60 * 1000
const maxCacheValueBytes = 512 * 1024
const maintenanceLimit = 100

export type ArtifactToolCacheOptions = {
  ttlMs: number
  forceRefresh: boolean
}

export type ArtifactToolCacheKeyInput = {
  tenantId: string
  artifactId: Id<"artifacts">
  versionId: Id<"artifactVersions">
  userId: string
  surface: string
  tool: string
  integrationId?: Id<"integrations">
  args: Record<string, unknown>
}

export const read = internalMutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    userId: v.string(),
    surface: v.string(),
    tool: v.string(),
    integrationId: v.optional(v.id("integrations")),
    cacheKey: v.string(),
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
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    userId: v.string(),
    surface: v.string(),
    tool: v.string(),
    integrationId: v.optional(v.id("integrations")),
    cacheKey: v.string(),
    value: v.any(),
    ttlMs: v.number(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    await deleteExpiredCacheDocuments(ctx, args.now)

    const document = await findCacheDocument(ctx, args)
    const expiresAt = args.now + clampCacheTtlMs(args.ttlMs)

    if (document === null) {
      await ctx.db.insert("artifactCaches", {
        tenantId: args.tenantId,
        artifactId: args.artifactId,
        versionId: args.versionId,
        userId: args.userId,
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
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    userId: v.string(),
    surface: v.string(),
    integrationId: v.optional(v.id("integrations")),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("artifactCaches")
      .withIndex("by_artifact_and_user_and_surface", (index) =>
        index
          .eq("artifactId", args.artifactId)
          .eq("userId", args.userId)
          .eq("surface", args.surface)
      )
      .take(maintenanceLimit)

    for (const document of documents) {
      if (
        document.tenantId === args.tenantId &&
        (args.integrationId === undefined ||
          document.integrationId === args.integrationId)
      ) {
        await ctx.db.delete(document._id)
      }
    }

    return null
  },
})

export function normalizeArtifactToolCacheOptions(input: {
  ttlMs?: unknown
  forceRefresh?: unknown
}): ArtifactToolCacheOptions {
  return {
    ttlMs: clampCacheTtlMs(readOptionalNumber(input.ttlMs)),
    forceRefresh: input.forceRefresh === true,
  }
}

export async function createArtifactToolCacheKey(
  input: ArtifactToolCacheKeyInput
) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableJson(input))
  )

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

export function canStoreArtifactToolCacheValue(value: unknown) {
  const json = JSON.stringify(value)

  return (
    json !== undefined &&
    new TextEncoder().encode(json).byteLength <= maxCacheValueBytes
  )
}

async function findCacheDocument(
  ctx: MutationCtx,
  args: {
    tenantId: string
    artifactId: Id<"artifacts">
    versionId: Id<"artifactVersions">
    userId: string
    surface: string
    tool: string
    integrationId?: Id<"integrations">
    cacheKey: string
  }
) {
  const document = await ctx.db
    .query("artifactCaches")
    .withIndex("by_artifact_and_key", (index) =>
      index.eq("artifactId", args.artifactId).eq("cacheKey", args.cacheKey)
    )
    .first()

  if (document === null) {
    return null
  }

  return document.tenantId === args.tenantId &&
    document.versionId === args.versionId &&
    document.userId === args.userId &&
    document.surface === args.surface &&
    document.tool === args.tool &&
    document.integrationId === args.integrationId
    ? document
    : null
}

async function deleteExpiredCacheDocuments(ctx: MutationCtx, now: number) {
  const documents = await ctx.db
    .query("artifactCaches")
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

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null"
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }

  const entries = Object.entries(value)
    .filter((entry) => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))

  return `{${entries
    .map(
      ([key, entryValue]) => `${JSON.stringify(key)}:${stableJson(entryValue)}`
    )
    .join(",")}}`
}
