import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type TableColumn } from "../../contracts/tables/columns"
import { nameRowValues, resolveNamedValues } from "../../contracts/tables/names"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, internalQuery } from "../_generated/server"
import {
  deleteDocument,
  insertDocuments,
  pageDocuments,
  writeDocument,
} from "../collections/documents"
import { insertPlacementValidator } from "../collections/order"
import { resourceViewerArgs } from "../visibility/resources"
import { getAccessibleTable, summarizeRow } from "./access"
import { tableSpec } from "./spec"

const importBatchSize = 100

/** The agent surface keys row values by column NAME — the only column
 *  identity it ever sees; the console keys by hidden id, so renames never
 *  move data. Passing "name" translates values both ways. */
const keyedByValidator = v.optional(v.literal("name"))

/** Places an insert beside an existing row of the same table; without an
 *  anchor, inserts append at the bottom. */
export const rowAnchorValidator = v.object({
  rowId: v.id("documents"),
  placement: insertPlacementValidator,
})

export const page = internalQuery({
  args: {
    ...resourceViewerArgs,
    tableId: v.id("collections"),
    paginationOpts: paginationOptsValidator,
    keyedBy: keyedByValidator,
  },
  handler: async (ctx, args) => {
    const table = await getAccessibleTable(ctx, args)
    const columns = table.columns
    const result = await pageDocuments(ctx, args.tableId, args.paginationOpts)

    return {
      rows: result.page.map((row) => keyedRow(args.keyedBy, columns, row)),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})

export const insert = internalMutation({
  args: {
    ...resourceViewerArgs,
    tableId: v.id("collections"),
    values: v.any(),
    anchor: v.optional(rowAnchorValidator),
    keyedBy: keyedByValidator,
  },
  handler: async (ctx, args) => {
    const table = await getAccessibleTable(ctx, args)
    const columns = table.columns
    const [row] = await insertDocuments(
      ctx,
      tableSpec,
      table,
      [keyedValues(args.keyedBy, columns, args.values)],
      args.anchor === undefined
        ? undefined
        : { documentId: args.anchor.rowId, placement: args.anchor.placement }
    )

    if (row === undefined) {
      throw new Error("Row insert failed.")
    }

    return keyedRow(args.keyedBy, columns, row)
  },
})

/** Batched insert for imports: every row is validated before the first
 *  write, so a batch either lands whole or not at all. */
export const insertMany = internalMutation({
  args: {
    ...resourceViewerArgs,
    tableId: v.id("collections"),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    if (args.rows.length === 0 || args.rows.length > importBatchSize) {
      throw new Error(
        `Row batches must hold 1 to ${importBatchSize} rows per call.`
      )
    }

    const table = await getAccessibleTable(ctx, args)
    const inserted = await insertDocuments(ctx, tableSpec, table, args.rows)

    return { inserted: inserted.length }
  },
})

/** Row updates are merges: entries replace their column's value wholesale,
 *  null clears it, and the merged row revalidates against the schema. */
export const update = internalMutation({
  args: {
    ...resourceViewerArgs,
    tableId: v.id("collections"),
    rowId: v.id("documents"),
    values: v.any(),
    expectedVersion: v.optional(v.number()),
    keyedBy: keyedByValidator,
  },
  handler: async (ctx, args) => {
    const table = await getAccessibleTable(ctx, args)
    const columns = table.columns
    const result = await writeDocument(ctx, tableSpec, table, {
      documentId: args.rowId,
      write: {
        type: "merge",
        patch: keyedValues(args.keyedBy, columns, args.values),
      },
      expectedVersion: args.expectedVersion,
    })

    if (result.status !== "written") {
      throw new Error("Row update failed.")
    }

    return keyedRow(args.keyedBy, columns, result.document)
  },
})

export const remove = internalMutation({
  args: {
    ...resourceViewerArgs,
    tableId: v.id("collections"),
    rowId: v.id("documents"),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const table = await getAccessibleTable(ctx, args)
    const row = await deleteDocument(ctx, tableSpec, table, {
      documentId: args.rowId,
      expectedVersion: args.expectedVersion,
    })

    return { rowId: row._id, deleted: true as const }
  },
})

function keyedValues(
  keyedBy: "name" | undefined,
  columns: TableColumn[],
  values: unknown
) {
  return keyedBy === "name" ? resolveNamedValues(columns, values) : values
}

function keyedRow(
  keyedBy: "name" | undefined,
  columns: TableColumn[],
  row: Doc<"documents">
) {
  const summary = summarizeRow(row)

  return keyedBy === "name"
    ? { ...summary, values: nameRowValues(columns, summary.values) }
    : summary
}
