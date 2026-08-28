import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { internalMutation, internalQuery } from "../_generated/server"
import {
  deleteDocument,
  insertDocuments,
  pageDocuments,
  writeDocument,
} from "../collections/documents"
import { getAccessibleTable, summarizeRow } from "./access"
import { tableSpec } from "./spec"

const importBatchSize = 100

export const page = internalQuery({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await getAccessibleTable(ctx, args)

    const result = await pageDocuments(ctx, args.tableId, args.paginationOpts)

    return {
      rows: result.page.map((row) => summarizeRow(row)),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})

export const insert = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
    values: v.any(),
  },
  handler: async (ctx, args) => {
    const table = await getAccessibleTable(ctx, args)
    const [row] = await insertDocuments(ctx, tableSpec, table, [args.values])

    if (row === undefined) {
      throw new Error("Row insert failed.")
    }

    return summarizeRow(row)
  },
})

/** Batched insert for imports: every row is validated before the first
 *  write, so a batch either lands whole or not at all. */
export const insertMany = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
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
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
    rowId: v.id("documents"),
    values: v.any(),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const table = await getAccessibleTable(ctx, args)
    const result = await writeDocument(ctx, tableSpec, table, {
      documentId: args.rowId,
      write: { type: "merge", patch: args.values },
      expectedVersion: args.expectedVersion,
    })

    if (result.status !== "written") {
      throw new Error("Row update failed.")
    }

    return summarizeRow(result.document)
  },
})

export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
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
