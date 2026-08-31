import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { createSight } from "../visibility/sight"

// Tree shape rules shared by every folder read and write: depth, ancestry,
// and the flat organization-wide listing the client builds its tree from.

/** A folder chain counts the folder itself, so roots sit at depth 1. */
export const maxTreeDepth = 8

/** One flat read serves the whole tree; organizations stay far below this,
 *  so a generous hard cap beats pagination. */
export const treeCap = 1000

export function normalizeFolderName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : ""

  if (name === "") {
    throw new Error("A name is required.")
  }

  return name.slice(0, 120)
}

export function summarizeFolder(folder: Doc<"folders">) {
  return {
    folderId: folder._id,
    name: folder.name,
    parentId: folder.parentId,
    visibility: folder.visibility,
    createdBy: folder.createdBy,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  }
}

/** Null for missing and foreign folders alike. */
export async function getOrganizationFolder(
  ctx: QueryLikeCtx,
  organizationId: string,
  folderId: Id<"folders">
) {
  const folder = await ctx.db.get(folderId)

  return folder === null || folder.organizationId !== organizationId
    ? null
    : folder
}

export async function requireOrganizationFolder(
  ctx: QueryLikeCtx,
  organizationId: string,
  folderId: Id<"folders">
) {
  const folder = await getOrganizationFolder(ctx, organizationId, folderId)

  if (folder === null) {
    throw new Error("Folder was not found.")
  }

  return folder
}

/** Missing, foreign, and invisible folders read the same, so callers
 *  cannot probe what exists behind a visibility gate. */
export async function requireVisibleFolder(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId: Id<"persons"> | undefined
    folderId: Id<"folders">
  }
) {
  const folder = await requireOrganizationFolder(
    ctx,
    args.organizationId,
    args.folderId
  )

  if (!(await createSight(ctx, args).canSeeFolder(folder))) {
    throw new Error("Folder was not found.")
  }

  return folder
}

/** Creation-time folder guard shared by every resource create mutation: no
 *  folder passes through as the workspace root, anything else must name a
 *  folder the creator can see. */
export async function resolveCreationFolder(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId: Id<"persons"> | undefined
    folderId: Id<"folders"> | undefined
  }
) {
  return args.folderId === undefined
    ? undefined
    : (await requireVisibleFolder(ctx, { ...args, folderId: args.folderId }))
        ._id
}

export async function listOrganizationFolders(
  ctx: QueryLikeCtx,
  organizationId: string
) {
  return await ctx.db
    .query("folders")
    .withIndex("by_organization_and_parent", (index) =>
      index.eq("organizationId", organizationId)
    )
    .take(treeCap)
}

/** Root-first breadcrumb chain ending with the folder itself. The walk stops
 *  at the depth cap, so corrupt parent links cannot loop it. */
export async function ancestorPath(ctx: QueryLikeCtx, folder: Doc<"folders">) {
  const path = [{ folderId: folder._id, name: folder.name }]
  let parentId = folder.parentId

  while (parentId !== undefined && path.length < maxTreeDepth) {
    const parent = await ctx.db.get(parentId)

    if (parent === null) {
      break
    }

    path.unshift({ folderId: parent._id, name: parent.name })
    parentId = parent.parentId
  }

  return path
}

export async function folderDepth(ctx: QueryLikeCtx, folder: Doc<"folders">) {
  return (await ancestorPath(ctx, folder)).length
}

/** True when the candidate is the folder itself or sits below it — moving
 *  the folder under the candidate would then create a cycle. */
export async function isSelfOrDescendant(
  ctx: QueryLikeCtx,
  folderId: Id<"folders">,
  candidate: Doc<"folders">
) {
  let cursor: Doc<"folders"> | null = candidate

  for (let step = 0; cursor !== null && step < maxTreeDepth; step += 1) {
    if (cursor._id === folderId) {
      return true
    }

    cursor =
      cursor.parentId === undefined ? null : await ctx.db.get(cursor.parentId)
  }

  return false
}

/** Longest downward chain from the folder, itself included; walking stops
 *  once the chain already exceeds the depth cap. */
export async function subtreeHeight(
  ctx: QueryLikeCtx,
  organizationId: string,
  folderId: Id<"folders">
) {
  let frontier = [folderId]
  let height = 0

  while (frontier.length > 0 && height <= maxTreeDepth) {
    height += 1

    const next: Id<"folders">[] = []

    for (const id of frontier) {
      const children = await ctx.db
        .query("folders")
        .withIndex("by_organization_and_parent", (index) =>
          index.eq("organizationId", organizationId).eq("parentId", id)
        )
        .take(treeCap)

      next.push(...children.map((child) => child._id))
    }

    frontier = next
  }

  return height
}
