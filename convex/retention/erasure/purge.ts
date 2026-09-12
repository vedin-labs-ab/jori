import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { belongsToWorkspace, contentTables } from "./tables"

export async function purgeContent(
  ctx: MutationCtx,
  row: Doc<"workspaceRetention">
) {
  const index = (row.stage ?? 6) - 6
  const table = contentTables[index]
  if (!table) {
    return true
  }
  const page = await ctx.db
    .query(table)
    .paginate({ cursor: row.cursor ?? null, numItems: 10 })
  for (const item of page.page) {
    if (!(await belongsToWorkspace(ctx, item, row.organizationId))) {
      continue
    }
    if (table === "files" && "storageId" in item && item.storageId) {
      await ctx.storage.delete(item.storageId)
    }
    await ctx.db.delete(item._id)
  }
  await ctx.db.patch(row._id, {
    stage: page.isDone ? (row.stage ?? 6) + 1 : row.stage,
    cursor: page.isDone ? undefined : page.continueCursor,
  })
  return false
}
