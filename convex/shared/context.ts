import { type WithoutSystemFields } from "convex/server"
import { type Doc, type TableNames } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"

export type QueryLikeCtx = MutationCtx | QueryCtx

/** Inserts a row and reads it back whole, system fields and all. */
export async function insertRow<TableName extends TableNames>(
  ctx: MutationCtx,
  table: TableName,
  row: WithoutSystemFields<Doc<TableName>>
): Promise<Doc<TableName>> {
  const inserted = await ctx.db.get(await ctx.db.insert(table, row))

  if (inserted === null) {
    throw new Error(`Insert into ${table} failed.`)
  }

  return inserted
}
