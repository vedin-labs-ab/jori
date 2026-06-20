import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"

const maxAttachmentSearchResults = 100
const maxAttachmentsScanned = 500

export const record = internalMutation({
  args: {
    tenantId: v.string(),
    runId: v.id("runs"),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("attachments", {
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
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_tenant_and_created_at", (index) =>
        index.eq("tenantId", args.tenantId)
      )
      .order("desc")
      .take(maxAttachmentsScanned)
    const matches = attachments
      .filter(
        (attachment) =>
          matchesQuery(attachment, query) &&
          matchesMimeType(attachment, mimeType)
      )
      .slice(0, limit)

    return await Promise.all(
      matches.map(
        async (attachment) => await summarizeAttachment(ctx, attachment)
      )
    )
  },
})

export const read = internalQuery({
  args: {
    tenantId: v.string(),
    attachmentId: v.id("attachments"),
  },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)

    if (attachment === null || attachment.tenantId !== args.tenantId) {
      return null
    }

    return await summarizeAttachment(ctx, attachment)
  },
})

export const getForTenant = internalQuery({
  args: {
    tenantId: v.string(),
    attachmentId: v.id("attachments"),
  },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)

    if (attachment === null || attachment.tenantId !== args.tenantId) {
      return null
    }

    return attachment
  },
})

export const getForRun = internalQuery({
  args: {
    attachmentId: v.id("attachments"),
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)

    if (attachment === null || attachment.runId !== args.runId) {
      return null
    }

    return attachment
  },
})

function normalizeLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 25
  }

  return Math.max(1, Math.min(maxAttachmentSearchResults, Math.trunc(value)))
}

function normalizeSearchText(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()

  return normalized === "" ? undefined : normalized
}

function matchesQuery(
  attachment: Doc<"attachments">,
  query: string | undefined
) {
  if (query === undefined) {
    return true
  }

  return [attachment.name, attachment.description, attachment.mimeType].some(
    (value) => value?.toLowerCase().includes(query) === true
  )
}

function matchesMimeType(
  attachment: Doc<"attachments">,
  mimeType: string | undefined
) {
  if (mimeType === undefined) {
    return true
  }

  const attachmentMimeType = attachment.mimeType.toLowerCase()

  return mimeType.endsWith("/")
    ? attachmentMimeType.startsWith(mimeType)
    : attachmentMimeType === mimeType
}

async function summarizeAttachment(
  ctx: QueryCtx,
  attachment: Doc<"attachments">
) {
  return {
    attachmentId: attachment._id,
    name: attachment.name,
    mimeType: attachment.mimeType,
    size: attachment.size,
    createdAt: attachment.createdAt,
    url: await ctx.storage.getUrl(attachment.storageId),
    ...(attachment.description === undefined
      ? {}
      : { description: attachment.description }),
  }
}
