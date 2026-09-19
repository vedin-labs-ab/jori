import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { query } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import {
  descendantFolderIds,
  listOrganizationFolders,
  requireVisibleFolder,
  treeCap,
} from "../../folders/tree"
import { resolveConsolePerson } from "../../persons/account"
import { createSight } from "../../visibility/sight"
import { capacityBytes, usageBucket } from "./meter"
import { rollup } from "./rollup"

export const overview = query({
  args: { organizationId: v.string(), folderId: v.optional(v.id("folders")) },
  returns: v.object({
    bytes: v.number(),
    capacity: v.number(),
    count: v.number(),
    folders: v.array(
      v.object({
        folderId: v.union(v.id("folders"), v.null()),
        name: v.string(),
        bytes: v.number(),
        count: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await resolveConsolePerson(
      ctx,
      args.organizationId,
      identity
    )
    const sight = createSight(ctx, {
      organizationId: args.organizationId,
      personId,
    })
    const total = await usageBucket(ctx, args.organizationId)
    const buckets = await ctx.db
      .query("fileUsage")
      .withIndex("by_organization_and_key", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(treeCap + 2)
    const folders = await listOrganizationFolders(ctx, args.organizationId)
    if (args.folderId !== undefined) {
      await requireVisibleFolder(
        ctx,
        { ...args, folderId: args.folderId, personId },
        sight
      )
    }
    const scopedIds =
      args.folderId === undefined
        ? undefined
        : new Set([
            args.folderId,
            ...(await descendantFolderIds(
              ctx,
              args.organizationId,
              args.folderId
            )),
          ])
    const { scope, totals } = rollup(buckets, folders, args.folderId, scopedIds)
    const rows = await visibleRows(folders, totals, sight, args.folderId)
    return {
      bytes: args.folderId === undefined ? (total?.bytes ?? 0) : scope.bytes,
      count: args.folderId === undefined ? (total?.count ?? 0) : scope.count,
      capacity: await capacityBytes(ctx, args.organizationId),
      folders: rows.sort((a, b) => b.bytes - a.bytes),
    }
  },
})

async function visibleRows(
  folders: Doc<"folders">[],
  totals: Map<string, { bytes: number; count: number }>,
  sight: ReturnType<typeof createSight>,
  folderId?: Id<"folders">
) {
  const rows: {
    folderId: Id<"folders"> | null
    name: string
    bytes: number
    count: number
  }[] = []
  for (const folder of folders) {
    if (folder.parentId !== folderId || !(await sight.canSeeFolder(folder))) {
      continue
    }
    const own = totals.get(folder._id)
    if (own !== undefined && own.count > 0) {
      rows.push({ folderId: folder._id, name: folder.name, ...own })
    }
  }
  const unfiled = totals.get("unfiled")
  if (unfiled !== undefined && unfiled.count > 0) {
    rows.push({
      folderId: null,
      name: folderId === undefined ? "Unfiled" : "Directly in this folder",
      ...unfiled,
    })
  }
  return rows
}
