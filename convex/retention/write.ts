import { type WithoutSystemFields } from "convex/server"
import { type Doc, type TableNames } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { assertWorkspaceAvailable } from "./access"

/** Inserts a row and reads it back whole, system fields and all. */
export async function insertRow<TableName extends TableNames>(
  ctx: MutationCtx,
  table: TableName,
  row: WithoutSystemFields<Doc<TableName>>
): Promise<Doc<TableName>> {
  if ("organizationId" in row && typeof row.organizationId === "string") {
    await assertWorkspaceAvailable(ctx, row.organizationId)
  }
  const inserted = await ctx.db.get(await ctx.db.insert(table, row))

  if (inserted === null) {
    throw new Error(`Insert into ${table} failed.`)
  }

  return inserted
}
