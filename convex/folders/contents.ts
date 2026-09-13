import { type Doc, type Id } from "../_generated/dataModel"
import { withOwnerDisplays } from "../persons/names"
import { type QueryLikeCtx } from "../shared/context"
import { createSight, type Sight } from "../visibility/sight"
import { filedTables } from "./filing"
import { sightedResources } from "./resources"
import { descendantFolderIds, summarizeFolder, treeCap } from "./tree"

// A folder's listing: subfolders plus the filed resources the caller may
// see. One Sight per request answers every row — a resource whose own
// visibility or ancestor folders exclude the caller simply does not appear.

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

  return await withOwnerDisplays(ctx, counted.sort(byName))
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
    // A folder belongs to whoever made it, under the same field name its
    // filed resources use, so one Owner column reads both row groups.
    ownerId: child.createdBy,
    folderCount,
    resourceCount,
  }
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

function byName(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name)
}
