import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"

const maxArtifactSearchResults = 100
const maxArtifactsScanned = 500

export const record = internalMutation({
  args: {
    tenantId: v.string(),
    executionId: v.id("executions"),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("artifacts", {
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
    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_tenant_and_created_at", (index) =>
        index.eq("tenantId", args.tenantId)
      )
      .order("desc")
      .take(maxArtifactsScanned)
    const matches = artifacts
      .filter(
        (artifact) =>
          matchesQuery(artifact, query) && matchesMimeType(artifact, mimeType)
      )
      .slice(0, limit)

    return await Promise.all(
      matches.map(async (artifact) => await summarizeArtifact(ctx, artifact))
    )
  },
})

export const read = internalQuery({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId)

    if (artifact === null || artifact.tenantId !== args.tenantId) {
      return null
    }

    return await summarizeArtifact(ctx, artifact)
  },
})

export const getForTenant = internalQuery({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId)

    if (artifact === null || artifact.tenantId !== args.tenantId) {
      return null
    }

    return artifact
  },
})

export const getForExecution = internalQuery({
  args: {
    executionId: v.id("executions"),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId)

    if (artifact === null || artifact.executionId !== args.executionId) {
      return null
    }

    return artifact
  },
})

function normalizeLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 25
  }

  return Math.max(1, Math.min(maxArtifactSearchResults, Math.trunc(value)))
}

function normalizeSearchText(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()

  return normalized === "" ? undefined : normalized
}

function matchesQuery(artifact: Doc<"artifacts">, query: string | undefined) {
  if (query === undefined) {
    return true
  }

  return [artifact.name, artifact.description, artifact.mimeType].some(
    (value) => value?.toLowerCase().includes(query) === true
  )
}

function matchesMimeType(
  artifact: Doc<"artifacts">,
  mimeType: string | undefined
) {
  if (mimeType === undefined) {
    return true
  }

  const artifactMimeType = artifact.mimeType.toLowerCase()

  return mimeType.endsWith("/")
    ? artifactMimeType.startsWith(mimeType)
    : artifactMimeType === mimeType
}

async function summarizeArtifact(ctx: QueryCtx, artifact: Doc<"artifacts">) {
  return {
    artifactId: artifact._id,
    name: artifact.name,
    mimeType: artifact.mimeType,
    size: artifact.size,
    createdAt: artifact.createdAt,
    url: await ctx.storage.getUrl(artifact.storageId),
    ...(artifact.description === undefined
      ? {}
      : { description: artifact.description }),
  }
}
