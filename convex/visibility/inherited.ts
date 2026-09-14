import { type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { type StoredVisibility } from "./schema"
import { type Sight } from "./sight"

/** Ancestor rules the viewer may inspect, ordered from outermost to nearest.
 * Owning a child never grants permission to inspect a hidden parent. */
export async function inheritedRestrictions(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders"> | undefined
) {
  const folders: {
    folderId: Id<"folders">
    name: string
    visibility: StoredVisibility
    ownerId: Id<"persons">
  }[] = []
  const visited = new Set<string>()
  let current = folderId
  let unavailable = false

  while (current !== undefined) {
    if (visited.has(current) || visited.size >= 16) {
      unavailable = true
      break
    }
    visited.add(current)
    const folder = await ctx.db.get(current)
    if (folder === null || folder.organizationId !== sight.organizationId) {
      unavailable = true
      break
    }
    if (!(await sight.canSeeFolder(folder))) {
      unavailable = true
    } else if (folder.visibility.mode !== "organization") {
      folders.push({
        folderId: folder._id,
        name: folder.name,
        visibility: folder.visibility,
        ownerId: folder.createdBy,
      })
    }
    current = folder.parentId
  }

  return { folders: folders.reverse(), unavailable }
}
