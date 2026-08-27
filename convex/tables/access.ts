import { type TableColumn } from "../../contracts/tables/columns"
import { type Doc, type Id } from "../_generated/dataModel"
import { accessibleMaterial, filterMaterialSearch } from "../materials/access"
import { type QueryLikeCtx } from "../shared/context"
import { boundedNumber } from "../shared/input"

const tableSearchLimit = 100

export async function searchTables(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    query?: string
    includeArchived?: boolean
    limit?: number
  }
) {
  const tables = await ctx.db
    .query("tables")
    .withIndex("by_organization_and_updated_at", (index) =>
      index.eq("organizationId", args.organizationId)
    )
    .order("desc")
    .take(tableSearchLimit)

  return filterMaterialSearch(tables, {
    ...args,
    limit: boundedNumber(args.limit, 25, 1, tableSearchLimit),
  })
}

/** Load a table only if it is in the organization and visible to the person;
 *  null otherwise, so callers cannot tell missing from inaccessible. */
export async function findAccessibleTable(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    tableId: Id<"tables">
    personId: Id<"persons">
  }
) {
  return accessibleMaterial(await ctx.db.get(args.tableId), args)
}

export async function getAccessibleTable(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    tableId: Id<"tables">
    personId: Id<"persons">
  }
) {
  const table = await findAccessibleTable(ctx, args)

  if (table === null) {
    throw new Error("Table not found.")
  }

  return table
}

export function summarizeTable(table: Doc<"tables">) {
  return {
    tableId: table._id,
    name: table.name,
    description: table.description,
    scope: table.scope,
    ownerId: table.ownerId,
    columns: table.columns as TableColumn[],
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
    archivedAt: table.archivedAt,
  }
}

export function summarizeRow(row: Doc<"tableRows">) {
  return {
    rowId: row._id,
    values: row.values as Record<string, unknown>,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
