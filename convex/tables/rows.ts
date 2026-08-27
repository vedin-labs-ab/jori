import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type TableColumn } from "../../contracts/tables/columns"
import { applyRowPatch, assertRowValues } from "../../contracts/tables/rows"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, internalQuery } from "../_generated/server"
import { assertExpectedVersion } from "../materials/input"
import { type QueryLikeCtx } from "../shared/context"
import { getAccessibleTable, summarizeRow } from "./access"

export const page = internalQuery({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    personId: v.id("persons"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await getAccessibleTable(ctx, args)

    const result = await ctx.db
      .query("tableRows")
      .withIndex("by_table", (index) => index.eq("tableId", args.tableId))
      .order("desc")
      .paginate(args.paginationOpts)

    return {
      rows: result.page.map((row) => summarizeRow(row)),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})

/** The one write path for rows: access, archival, column validation, and
 *  per-row optimistic versioning all live here. */
export const insert = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    personId: v.id("persons"),
    values: v.any(),
  },
  handler: async (ctx, args) => {
    const table = await getWritableTable(ctx, args)

    assertValues(table, args.values)

    const now = Date.now()
    const rowId = await ctx.db.insert("tableRows", {
      organizationId: args.organizationId,
      tableId: args.tableId,
      values: args.values,
      version: 1,
      createdAt: now,
      updatedAt: now,
    })
    const row = await ctx.db.get(rowId)

    if (row === null) {
      throw new Error("Row insert failed.")
    }

    return summarizeRow(row)
  },
})

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    personId: v.id("persons"),
    rowId: v.id("tableRows"),
    values: v.any(),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const table = await getWritableTable(ctx, args)
    const row = await getTableRow(ctx, table, args.rowId)

    assertExpectedVersion(args.expectedVersion, row.version, "Row")

    const values = applyRowPatch(row.values, args.values)

    assertValues(table, values)

    const version = row.version + 1
    const updatedAt = Date.now()

    await ctx.db.patch(row._id, { values, version, updatedAt })

    return summarizeRow({ ...row, values, version, updatedAt })
  },
})

export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    personId: v.id("persons"),
    rowId: v.id("tableRows"),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const table = await getWritableTable(ctx, args)
    const row = await getTableRow(ctx, table, args.rowId)

    assertExpectedVersion(args.expectedVersion, row.version, "Row")
    await ctx.db.delete(row._id)

    return { rowId: row._id, deleted: true as const }
  },
})

async function getWritableTable(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    tableId: Id<"tables">
    personId: Id<"persons">
  }
) {
  const table = await getAccessibleTable(ctx, args)

  if (table.archivedAt !== undefined) {
    throw new Error("Table is archived. Restore it to change rows.")
  }

  return table
}

async function getTableRow(
  ctx: QueryLikeCtx,
  table: Doc<"tables">,
  rowId: Id<"tableRows">
) {
  const row = await ctx.db.get(rowId)

  if (row === null || row.tableId !== table._id) {
    throw new Error("Row not found.")
  }

  return row
}

function assertValues(table: Doc<"tables">, values: unknown) {
  assertRowValues({
    columns: table.columns as TableColumn[],
    values,
    label: `Table ${table.name} row`,
  })
}
