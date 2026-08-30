import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { filedTables } from "./filing"
import {
  folderDepth,
  isSelfOrDescendant,
  maxTreeDepth,
  normalizeFolderName,
  requireOrganizationFolder,
  requireVisibleFolder,
  subtreeHeight,
} from "./tree"

// Folder records: create, rename, move, and the reparenting delete. Sibling
// names are deliberately not unique — like Drive, unlike a filesystem:
// folders are labels for humans, and ids already carry identity.

const reparentBatchSize = 200

export async function createFolder(
  ctx: MutationCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    name: string
    parentId?: Id<"folders">
  }
) {
  if (args.parentId !== undefined) {
    const parent = await requireVisibleFolder(ctx, {
      organizationId: args.organizationId,
      personId: args.personId,
      folderId: args.parentId,
    })

    assertDepth((await folderDepth(ctx, parent)) + 1)
  }

  const now = Date.now()
  const folderId = await ctx.db.insert("folders", {
    organizationId: args.organizationId,
    name: normalizeFolderName(args.name),
    parentId: args.parentId,
    createdBy: args.personId,
    createdAt: now,
    updatedAt: now,
  })

  return await requireOrganizationFolder(ctx, args.organizationId, folderId)
}

export async function renameFolder(
  ctx: MutationCtx,
  args: { organizationId: string; folderId: Id<"folders">; name: string }
) {
  const folder = await requireOrganizationFolder(
    ctx,
    args.organizationId,
    args.folderId
  )

  await ctx.db.patch(folder._id, {
    name: normalizeFolderName(args.name),
    updatedAt: Date.now(),
  })

  return await requireOrganizationFolder(ctx, args.organizationId, folder._id)
}

/** Reparent a folder; an absent parent moves it to the root. Rejects moves
 *  into the folder's own subtree and moves that would sink any descendant
 *  below the depth cap. */
export async function moveFolder(
  ctx: MutationCtx,
  args: {
    organizationId: string
    folderId: Id<"folders">
    parentId?: Id<"folders">
  }
) {
  const folder = await requireOrganizationFolder(
    ctx,
    args.organizationId,
    args.folderId
  )

  if (args.parentId !== undefined) {
    const parent = await requireOrganizationFolder(
      ctx,
      args.organizationId,
      args.parentId
    )

    if (await isSelfOrDescendant(ctx, folder._id, parent)) {
      throw new Error("A folder cannot be moved into its own subtree.")
    }

    const parentDepth = await folderDepth(ctx, parent)
    const height = await subtreeHeight(ctx, args.organizationId, folder._id)

    assertDepth(parentDepth + height)
  }

  await ctx.db.patch(folder._id, {
    parentId: args.parentId,
    updatedAt: Date.now(),
  })

  return await requireOrganizationFolder(ctx, args.organizationId, folder._id)
}

/** Deleting a folder reparents its contents — child folders and every filed
 *  resource — to the deleted folder's parent (the root when none), so
 *  deletion never orphans and never refuses. The first batch runs inside the
 *  deleting mutation, settling small folders atomically; larger ones finish
 *  through the house self-rescheduling batch pattern. Everything moves one
 *  level up, so depth can only shrink and needs no check. */
export async function removeFolder(
  ctx: MutationCtx,
  args: { organizationId: string; folderId: Id<"folders"> }
) {
  const folder = await requireOrganizationFolder(
    ctx,
    args.organizationId,
    args.folderId
  )

  await ctx.db.delete(folder._id)
  await reparentBatch(ctx, {
    organizationId: args.organizationId,
    folderId: folder._id,
    parentId: folder.parentId,
  })
}

export const reparent = internalMutation({
  args: {
    organizationId: v.string(),
    folderId: v.id("folders"),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    await reparentBatch(ctx, args)

    return null
  },
})

async function reparentBatch(
  ctx: MutationCtx,
  args: {
    organizationId: string
    folderId: Id<"folders">
    parentId?: Id<"folders">
  }
) {
  const target = { ...args, parentId: await liveParentId(ctx, args.parentId) }
  let overflow = await reparentChildFolders(ctx, target)

  for (const table of filedTables) {
    if (await reparentFiledRows(ctx, table, target)) {
      overflow = true
    }
  }

  if (overflow) {
    await ctx.scheduler.runAfter(0, internal.folders.records.reparent, target)
  }
}

/** Concurrent deletions can take the destination folder down before a batch
 *  runs; rows then go to the root instead of dangling under a dead id. */
async function liveParentId(ctx: MutationCtx, parentId?: Id<"folders">) {
  if (parentId === undefined || (await ctx.db.get(parentId)) === null) {
    return undefined
  }

  return parentId
}

async function reparentChildFolders(
  ctx: MutationCtx,
  args: {
    organizationId: string
    folderId: Id<"folders">
    parentId?: Id<"folders">
  }
) {
  const now = Date.now()
  const children = await ctx.db
    .query("folders")
    .withIndex("by_organization_and_parent", (index) =>
      index
        .eq("organizationId", args.organizationId)
        .eq("parentId", args.folderId)
    )
    .take(reparentBatchSize)

  for (const child of children) {
    await ctx.db.patch(child._id, { parentId: args.parentId, updatedAt: now })
  }

  return children.length === reparentBatchSize
}

/** Refiling is organization, not content: updatedAt stays untouched so
 *  recency-ordered lists keep meaning "content changed". */
async function reparentFiledRows(
  ctx: MutationCtx,
  table: (typeof filedTables)[number],
  args: { folderId: Id<"folders">; parentId?: Id<"folders"> }
) {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_folder", (index) => index.eq("folderId", args.folderId))
    .take(reparentBatchSize)

  for (const row of rows) {
    await ctx.db.patch(row._id, { folderId: args.parentId })
  }

  return rows.length === reparentBatchSize
}

function assertDepth(depth: number) {
  if (depth > maxTreeDepth) {
    throw new Error(`Folders can nest at most ${maxTreeDepth} levels deep.`)
  }
}
