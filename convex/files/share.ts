import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { shareExpiresAt } from "../../contracts/shares/expiry"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import {
  canOpenShare,
  type MintedShare,
  mintedShare,
  randomShareSecret,
  shareLink,
  sharesToRetire,
} from "../materials/shares"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import { canViewFile } from "./data"

/** Create an independent share link; existing links keep their own expiry.
 *  A link is a read capability for this one file regardless of scope. */
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
    shareId: v.id("fileShares"),
  },
  handler: async (ctx, args): Promise<null> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)
    const file = await getViewableFile(ctx, { ...args, personId })
    const share = await ctx.db.get(args.shareId)

    if (
      share === null ||
      share.fileId !== file._id ||
      share.organizationId !== file.organizationId
    ) {
      throw new Error("Share link not found.")
    }

    await ctx.db.delete(share._id)

    return null
  },
})

/** Expiration order is also lifecycle order: every future expiry sorts ahead
 *  of every past expiry, so one indexed cursor yields active links first. */
export const page = query({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    await getViewableFile(ctx, { ...args, personId })

    const result = await ctx.db
      .query("fileShares")
      .withIndex("by_file_and_expires_at", (index) =>
        index.eq("fileId", args.fileId)
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

/** Anonymous share read: the secret is the whole credential. Returns null on
 *  every failure so callers cannot probe which files exist. Storage URLs are
 *  signed and temporary, so each read mints a fresh one. */
export const get = query({
  args: { fileId: v.string(), secret: v.string() },
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
      expiresAt: opened.share.expiresAt,
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
  const file = await getViewableFile(ctx, args)
  const now = Date.now()
  const secret = randomShareSecret()
  const expiresAt = shareExpiresAt(now, args.expiresInHours)
  const activeShares = await ctx.db
    .query("fileShares")
    .withIndex("by_file_and_expires_at", (index) =>
      index.eq("fileId", file._id).gt("expiresAt", now)
    )
    .collect()

  for (const stale of sharesToRetire(activeShares, now)) {
    await ctx.db.delete(stale._id)
  }

  await ctx.db.insert("fileShares", {
    organizationId: file.organizationId,
    fileId: file._id,
    createdBy: args.personId,
    secret,
    createdAt: now,
    expiresAt,
  })

  return mintedShare(shareLink(`/files/${file._id}`, secret), expiresAt)
}

/** Resolve a share link to its file: secret, expiry, organization, and the
 *  creator's continued visibility all checked on every read. */
export async function openFileShare(
  ctx: QueryLikeCtx,
  args: { fileId: string; secret: string }
) {
  const fileId = ctx.db.normalizeId("files", args.fileId)
  const file = fileId === null ? null : await ctx.db.get(fileId)

  if (fileId === null || file === null) {
    return null
  }

  const share = await ctx.db
    .query("fileShares")
    .withIndex("by_file_and_secret", (index) =>
      index.eq("fileId", fileId).eq("secret", args.secret)
    )
    .unique()

  if (
    share === null ||
    !canOpenShare({
      share,
      material: file,
      creatorHasAccess: canViewFile(file, {
        organizationId: share.organizationId,
        personId: share.createdBy,
      }),
      secret: args.secret,
      now: Date.now(),
    })
  ) {
    return null
  }

  return { file, share }
}

async function getViewableFile(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    fileId: Id<"files">
    personId: Id<"persons">
  }
) {
  const file = await ctx.db.get(args.fileId)

  if (
    file === null ||
    !canViewFile(file, {
      organizationId: args.organizationId,
      personId: args.personId,
    })
  ) {
    throw new Error("File was not found")
  }

  return file
}
