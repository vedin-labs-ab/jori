import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"

const maxFileSearchResults = 100
const maxFilesScanned = 500

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
    return await ctx.db.insert("files", {
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
    const files = await ctx.db
      .query("files")
      .withIndex("by_tenant_and_created_at", (index) =>
        index.eq("tenantId", args.tenantId)
      )
      .order("desc")
      .take(maxFilesScanned)
    const matches = files
      .filter(
        (file) => matchesQuery(file, query) && matchesMimeType(file, mimeType)
      )
      .slice(0, limit)

    return await Promise.all(
      matches.map(async (file) => await summarizeFile(ctx, file))
    )
  },
})

export const read = internalQuery({
  args: {
    tenantId: v.string(),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)

    if (file === null || file.tenantId !== args.tenantId) {
      return null
    }

    return await summarizeFile(ctx, file)
  },
})

export const getForTenant = internalQuery({
  args: {
    tenantId: v.string(),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)

    if (file === null || file.tenantId !== args.tenantId) {
      return null
    }

    return file
  },
})

export const getForExecution = internalQuery({
  args: {
    executionId: v.id("executions"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)

    if (file === null || file.executionId !== args.executionId) {
      return null
    }

    return file
  },
})

function normalizeLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 25
  }

  return Math.max(1, Math.min(maxFileSearchResults, Math.trunc(value)))
}

function normalizeSearchText(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()

  return normalized === "" ? undefined : normalized
}

function matchesQuery(file: Doc<"files">, query: string | undefined) {
  if (query === undefined) {
    return true
  }

  return [file.name, file.description, file.mimeType].some(
    (value) => value?.toLowerCase().includes(query) === true
  )
}

function matchesMimeType(file: Doc<"files">, mimeType: string | undefined) {
  if (mimeType === undefined) {
    return true
  }

  const fileMimeType = file.mimeType.toLowerCase()

  return mimeType.endsWith("/")
    ? fileMimeType.startsWith(mimeType)
    : fileMimeType === mimeType
}

async function summarizeFile(ctx: QueryCtx, file: Doc<"files">) {
  return {
    fileId: file._id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt,
    url: await ctx.storage.getUrl(file.storageId),
    ...(file.description === undefined
      ? {}
      : { description: file.description }),
  }
}
