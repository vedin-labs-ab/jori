import { type Doc, type TableNames } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"

export async function belongsToWorkspace(
  ctx: Pick<QueryCtx, "db">,
  row: Doc<TableNames>,
  organizationId: string
) {
  if ("organizationId" in row) {
    return row.organizationId === organizationId
  }
  if ("collectionId" in row) {
    const parent = await ctx.db.get(row.collectionId)
    return parent?.organizationId === organizationId
  }
  if ("conversationId" in row && row.conversationId) {
    const parent = await ctx.db.get(row.conversationId)
    return parent?.organizationId === organizationId
  }
  if ("runId" in row && row.runId) {
    const parent = await ctx.db.get(row.runId)
    return parent?.organizationId === organizationId
  }
  return false
}
