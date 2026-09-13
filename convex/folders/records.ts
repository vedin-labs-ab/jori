import { v } from "convex/values"
import { availableFolderName } from "../../contracts/folders/name"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { createSight } from "../visibility/sight"
import { filedTables, purgeRow, refileRow } from "./filing"
import { reparentSpend } from "./spend"
import {
  descendantFolderIds,
  folderDepth,
  isSelfOrDescendant,
  maxTreeDepth,
  normalizeFolderName,
  requireOrganizationFolder,
  requireVisibleFolder,
  subtreeHeight,
  treeCap,
} from "./tree"

// Folder records: create, rename, move, and the subtree delete. Sibling
// names are deliberately not unique — like Drive, unlike a filesystem:
// folders are labels for humans, and ids already carry identity.

/** Rows one pass may touch before it hands the rest to the next one. */
const sweepBudget = 200

export async function createFolder(
  ctx: MutationCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    name?: string
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
    name: normalizeFolderName(args.name ?? (await generatedName(ctx, args))),
    // New folders gate nothing; people narrow them in the console.
    visibility: { mode: "organization" },
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

/** Deleting a folder deletes its whole subtree: every folder below it goes
 *  with it. What was filed anywhere inside either follows the deleted
 *  folder's parent — becoming unfiled when it had none — or, when the caller
 *  asks for it, is deleted along with the folders. The first pass runs
 *  inside the deleting mutation, settling ordinary folders atomically; a
 *  subtree too large for one transaction finishes through the house
 *  self-rescheduling batch pattern. Everything that survives moves up, so
 *  depth can only shrink and needs no check. */
export async function removeFolder(
  ctx: MutationCtx,
  args: {
    organizationId: string
    folderId: Id<"folders">
    deleteResources: boolean
  }
) {
  const folder = await requireOrganizationFolder(
    ctx,
    args.organizationId,
    args.folderId
  )

  // The folder leaves every listing at once; its descendants still name its
  // id, which is exactly what the sweep walks down from.
  await ctx.db.delete(folder._id)
  await sweepSubtree(ctx, {
    organizationId: args.organizationId,
    folderId: folder._id,
    parentId: folder.parentId,
    deleteResources: args.deleteResources,
  })
}

export const sweep = internalMutation({
  args: {
    organizationId: v.string(),
    folderId: v.id("folders"),
    parentId: v.optional(v.id("folders")),
    deleteResources: v.boolean(),
  },
  handler: async (ctx, args) => {
    await sweepSubtree(ctx, args)

    return null
  },
})

type SweepArgs = {
  organizationId: string
  folderId: Id<"folders">
  parentId?: Id<"folders">
  deleteResources: boolean
}

/** One bounded pass over what is left of the subtree, deepest folder first
 *  so no folder row is deleted before the descendants that name it. A pass
 *  that spends its budget reschedules itself and reads the remaining work
 *  back out of the database. */
async function sweepSubtree(ctx: MutationCtx, args: SweepArgs) {
  // Where everything that survives the deletion goes. Filed resources only
  // follow it when the caller kept them; spend always does.
  const destination = await liveParentId(ctx, args.parentId)
  const descendants = await descendantFolderIds(
    ctx,
    args.organizationId,
    args.folderId
  )
  let budget = sweepBudget

  for (const folderId of [...descendants, args.folderId]) {
    budget -= await emptyFolder(ctx, {
      organizationId: args.organizationId,
      folderId,
      destination,
      deleteResources: args.deleteResources,
      budget,
    })

    if (budget <= 0) {
      await ctx.scheduler.runAfter(0, internal.folders.records.sweep, args)

      return
    }

    // The root's row went with the deleting mutation; the rest go here,
    // each one only once its own contents are settled.
    if (folderId !== args.folderId) {
      await ctx.db.delete(folderId)
    }
  }
}

/** Empties one folder of everything filed in it, within the pass's budget:
 *  each row either follows the deleted folder's parent or dies with it.
 *  Spend is the exception — it only ever moves. Returns the rows touched. */
async function emptyFolder(
  ctx: MutationCtx,
  args: {
    organizationId: string
    folderId: Id<"folders">
    destination: Id<"folders"> | undefined
    deleteResources: boolean
    budget: number
  }
) {
  let touched = await reparentSpend(ctx, args)

  for (const table of filedTables) {
    if (touched >= args.budget) {
      break
    }

    const rows = await ctx.db
      .query(table)
      .withIndex("by_folder", (index) => index.eq("folderId", args.folderId))
      .take(args.budget - touched)

    for (const row of rows) {
      if (args.deleteResources) {
        await purgeRow(ctx, table, row, args.destination)
      } else {
        await refileRow(ctx, table, row, args.destination)
      }
    }

    touched += rows.length
  }

  return touched
}

/** Concurrent deletions can take the destination folder down before a pass
 *  runs; rows then go to the root instead of dangling under a dead id. */
async function liveParentId(ctx: MutationCtx, parentId?: Id<"folders">) {
  if (parentId === undefined || (await ctx.db.get(parentId)) === null) {
    return undefined
  }

  return parentId
}

function assertDepth(depth: number) {
  if (depth > maxTreeDepth) {
    throw new Error(`Folders can nest at most ${maxTreeDepth} levels deep.`)
  }
}

/** Runs inside creation's transaction, so concurrent creates retry against
 *  the new sibling. Hidden names never influence the generated label. */
async function generatedName(
  ctx: MutationCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    parentId?: Id<"folders">
  }
) {
  const siblings = await ctx.db
    .query("folders")
    .withIndex("by_organization_and_parent", (q) =>
      q.eq("organizationId", args.organizationId).eq("parentId", args.parentId)
    )
    .take(treeCap + 1)
  if (siblings.length > treeCap) {
    throw new Error("This folder has too many subfolders.")
  }
  const sight = createSight(ctx, args)
  const names: string[] = []
  for (const sibling of siblings) {
    if (await sight.canSeeFolder(sibling)) {
      names.push(sibling.name)
    }
  }
  return availableFolderName(names)
}
