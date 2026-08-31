import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import {
  type MintedShare,
  mintShare,
  openMaterialRead,
  pageShares,
  revokeShare,
  type ShareTarget,
} from "../collections/shares"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import { requireViewableFile } from "./records"

export const mint = internalMutation({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    personId: v.id("persons"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => await mintFileShare(ctx, args),
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<MintedShare> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.files.share.mint, {
      ...args,
      personId,
    })
  },
})

export const revoke = mutation({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    shareId: v.id("shares"),
  },
  handler: async (ctx, args): Promise<null> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)
    const file = await requireViewableFile(
      ctx,
      { ...args, personId },
      args.fileId
    )

    await revokeShare(ctx, {
      target: fileTarget(file._id),
      organizationId: file.organizationId,
      shareId: args.shareId,
    })

    return null
  },
})

export const page = query({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const file = await requireViewableFile(
      ctx,
      { ...args, personId },
      args.fileId
    )

    return await pageShares(ctx, fileTarget(file._id), args.paginationOpts)
  },
})

/** Anonymous read: a share secret or the file's own public visibility is
 *  the whole credential. Returns null on every failure so callers cannot
 *  probe which files exist. Storage URLs are signed and temporary, so each
 *  read mints a fresh one. */
export const get = query({
  args: { fileId: v.string(), secret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const opened = await openFileShare(ctx, args)

    if (opened === null) {
      return null
    }

    return {
      name: opened.file.name,
      description: opened.file.description,
      mimeType: opened.file.mimeType,
      size: opened.file.size,
      createdAt: opened.file.createdAt,
      url: await ctx.storage.getUrl(opened.file.storageId),
      access: opened.read.access,
      expiresAt:
        opened.read.access === "share" ? opened.read.expiresAt : undefined,
    }
  },
})

export async function mintFileShare(
  ctx: MutationCtx,
  args: {
    organizationId: string
    fileId: Id<"files">
    personId: Id<"persons">
    expiresInHours?: number
  }
): Promise<MintedShare> {
  const file = await requireViewableFile(ctx, args, args.fileId)

  return await mintShare(ctx, {
    target: fileTarget(file._id),
    organizationId: file.organizationId,
    personId: args.personId,
    urlPath: `/files/${file._id}`,
    expiresInHours: args.expiresInHours,
  })
}

/** Resolve an anonymous read to its file: a share link's secret, expiry,
 *  organization, and the creator's continued visibility all checked on
 *  every read — or the file's own public visibility. */
export async function openFileShare(
  ctx: QueryLikeCtx,
  args: { fileId: string; secret?: string }
) {
  const fileId = ctx.db.normalizeId("files", args.fileId)
  const file = fileId === null ? null : await ctx.db.get(fileId)

  if (file === null) {
    return null
  }

  const read = await openMaterialRead(ctx, {
    target: fileTarget(file._id),
    material: file,
    secret: args.secret,
  })

  return read === null ? null : { file, read }
}

function fileTarget(fileId: Id<"files">): ShareTarget {
  return { kind: "file", id: fileId }
}
