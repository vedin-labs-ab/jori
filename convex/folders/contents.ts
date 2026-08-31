import { type VisibilityMode } from "../../contracts/visibility"
import { type Doc, type Id } from "../_generated/dataModel"
import { canSeeAutomation } from "../automations/access"
import { type QueryLikeCtx } from "../shared/context"
import { createSight, type Sight } from "../visibility/sight"
import { filedTables } from "./filing"
import { descendantFolderIds, summarizeFolder, treeCap } from "./tree"

// A folder's listing: subfolders plus the filed resources the caller may
// see. One Sight per request answers every row — a resource whose own
// visibility or ancestor folders exclude the caller simply does not appear.

/** Per-type ceiling on one folder's listed resources; generous because a
 *  folder is a curated shelf, not an archive — no cross-type pagination. */
const contentsCap = 200

type Viewer = {
  organizationId: string
  personId: Id<"persons">
  folderId: Id<"folders">
}

export type FolderResource = {
  type: "table" | "store" | "file" | "automation"
  id: Id<"collections"> | Id<"files"> | Id<"automations">
  name: string
  visibility: VisibilityMode
  updatedAt: number
  mimeType?: string
  size?: number
  status?: Doc<"automations">["status"]
}

/** The folders one level below a parent — the root when none — each carrying
 *  the direct-child counts its listing row shows. Counting reads the same
 *  capped ranges the child's own listing would, so the number a row shows is
 *  the number a click reveals for this viewer. */
export async function folderChildren(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    parentId: Id<"folders"> | undefined
  }
) {
  const children = await ctx.db
    .query("folders")
    .withIndex("by_organization_and_parent", (index) =>
      index
        .eq("organizationId", args.organizationId)
        .eq("parentId", args.parentId)
    )
    .take(treeCap)
  const sight = createSight(ctx, args)
  const counted = []

  for (const child of children) {
    if (await sight.canSeeFolder(child)) {
      counted.push(await countChild(ctx, sight, child))
    }
  }

  return counted.sort(byName)
}

/** Direct children only, deliberately: a deep total would be neither cheap
 *  nor what a click shows. Resource counts run through the same Sight the
 *  child's own listing would use, so archived collections and materials the
 *  viewer may not see stay out of the number exactly as they stay out of
 *  the listing. */
async function countChild(
  ctx: QueryLikeCtx,
  sight: Sight,
  child: Doc<"folders">
) {
  const subfolders = await ctx.db
    .query("folders")
    .withIndex("by_organization_and_parent", (index) =>
      index.eq("organizationId", child.organizationId).eq("parentId", child._id)
    )
    .take(treeCap)
  const visibleSubfolders = []

  for (const subfolder of subfolders) {
    if (await sight.canSeeFolder(subfolder)) {
      visibleSubfolders.push(subfolder)
    }
  }

  const resources = await sightedResources(ctx, sight, child._id)
  const folderCount = visibleSubfolders.length
  const resourceCount = resources.length

  return {
    ...summarizeFolder(child),
    folderCount,
    resourceCount,
    hasContents: folderCount + resourceCount > 0,
  }
}

/** One tree row per folder: the summary plus a single honest signal —
 *  whether anything sits inside it, meaning a subfolder or any filed
 *  resource. Existence only: a folder whose subfolder is also listed costs
 *  nothing, the rest at most one cheap indexed probe per filed table plus
 *  one for subfolders. */
export async function summarizeTree(
  ctx: QueryLikeCtx,
  folders: Doc<"folders">[]
) {
  const parentIds = new Set(folders.map((folder) => folder.parentId))

  return await Promise.all(
    folders.map(async (folder) => ({
      ...summarizeFolder(folder),
      hasContents:
        parentIds.has(folder._id) ||
        (await hasFiledResources(ctx, folder._id)) ||
        (await hasSubfolders(ctx, folder)),
    }))
  )
}

async function hasSubfolders(ctx: QueryLikeCtx, folder: Doc<"folders">) {
  const child = await ctx.db
    .query("folders")
    .withIndex("by_organization_and_parent", (index) =>
      index
        .eq("organizationId", folder.organizationId)
        .eq("parentId", folder._id)
    )
    .first()

  return child !== null
}

async function hasFiledResources(ctx: QueryLikeCtx, folderId: Id<"folders">) {
  for (const table of filedTables) {
    const filed = await ctx.db
      .query(table)
      .withIndex("by_folder", (index) => index.eq("folderId", folderId))
      .first()

    if (filed !== null) {
      return true
    }
  }

  return false
}

/** What deleting a folder would take with it: the folders below it and
 *  every resource filed anywhere in the subtree. Deletion is absolute, so
 *  the counts run past Sight — archived collections and rows this viewer
 *  cannot see die all the same, and a number that hid them would lie. The
 *  tree caps bound the walk. parentName says where the survivors land, or
 *  is null for a root folder, whose contents become unfiled instead. */
export async function subtreeImpact(ctx: QueryLikeCtx, folder: Doc<"folders">) {
  const descendants = await descendantFolderIds(
    ctx,
    folder.organizationId,
    folder._id
  )
  let resourceCount = 0

  for (const folderId of [...descendants, folder._id]) {
    for (const table of filedTables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_folder", (index) => index.eq("folderId", folderId))
        .collect()

      resourceCount += rows.length
    }
  }

  const parent =
    folder.parentId === undefined ? null : await ctx.db.get(folder.parentId)

  return {
    folderCount: descendants.length,
    parentName: parent?.name ?? null,
    resourceCount,
  }
}

export async function folderResources(
  ctx: QueryLikeCtx,
  args: Viewer
): Promise<FolderResource[]> {
  return await sightedResources(ctx, createSight(ctx, args), args.folderId)
}

async function sightedResources(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders">
): Promise<FolderResource[]> {
  const resources = [
    ...(await folderCollections(ctx, sight, folderId)),
    ...(await folderFiles(ctx, sight, folderId)),
    ...(await folderAutomations(ctx, sight, folderId)),
  ]

  return resources.sort(byName)
}

/** Archived collections stay filed but hidden, matching the default list
 *  views; restoring one brings it back to its folder. */
async function folderCollections(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders">
): Promise<FolderResource[]> {
  const rows = await ctx.db
    .query("collections")
    .withIndex("by_folder", (index) => index.eq("folderId", folderId))
    .take(contentsCap)
  const listed: FolderResource[] = []

  for (const row of rows) {
    if (row.archivedAt === undefined && (await sight.canSee(row))) {
      listed.push({
        type: row.kind === "table" ? "table" : "store",
        id: row._id,
        name: row.name,
        visibility: row.visibility.mode,
        updatedAt: row.updatedAt,
      })
    }
  }

  return listed
}

async function folderFiles(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders">
): Promise<FolderResource[]> {
  const rows = await ctx.db
    .query("files")
    .withIndex("by_folder", (index) => index.eq("folderId", folderId))
    .take(contentsCap)
  const listed: FolderResource[] = []

  for (const row of rows) {
    if (await sight.canSee(row)) {
      listed.push({
        type: "file",
        id: row._id,
        name: row.name,
        visibility: row.visibility.mode,
        updatedAt: row.updatedAt,
        mimeType: row.mimeType,
        size: row.size,
      })
    }
  }

  return listed
}

async function folderAutomations(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders">
): Promise<FolderResource[]> {
  const rows = await ctx.db
    .query("automations")
    .withIndex("by_folder", (index) => index.eq("folderId", folderId))
    .take(contentsCap)
  const listed: FolderResource[] = []

  for (const row of rows) {
    if (await canSeeAutomation(sight, row)) {
      listed.push({
        type: "automation",
        id: row._id,
        name: row.name,
        visibility: row.visibility.mode,
        updatedAt: row.updatedAt,
        status: row.status,
      })
    }
  }

  return listed
}

function byName(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name)
}
