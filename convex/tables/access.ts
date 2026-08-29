import { type TableColumn } from "../../contracts/tables/columns"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  findAccessibleCollection,
  getAccessibleCollection,
  searchCollections,
} from "../collections/access"
import { type CollectionDoc } from "../collections/spec"
import { type QueryLikeCtx } from "../shared/context"
import { tableSpec } from "./spec"

type TableDoc = CollectionDoc<"table">

type TableArgs = {
  organizationId: string
  tableId: Id<"collections">
  personId: Id<"persons">
}

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
  return await searchCollections(ctx, tableSpec, args)
}

/** Load a table only if it is in the organization and visible to the person;
 *  null otherwise, so callers cannot tell missing from inaccessible. */
export async function findAccessibleTable(ctx: QueryLikeCtx, args: TableArgs) {
  return await findAccessibleCollection(ctx, tableSpec, toCollectionArgs(args))
}

export async function getAccessibleTable(ctx: QueryLikeCtx, args: TableArgs) {
  return await getAccessibleCollection(ctx, tableSpec, toCollectionArgs(args))
}

export function summarizeTable(table: TableDoc) {
  return {
    tableId: table._id,
    name: table.name,
    description: table.description,
    scope: table.scope,
    ownerId: table.ownerId,
    folderId: table.folderId,
    columns: table.columns as TableColumn[],
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
    archivedAt: table.archivedAt,
  }
}

export function summarizeRow(row: Doc<"documents">) {
  return {
    rowId: row._id,
    values: row.value as Record<string, unknown>,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toCollectionArgs(args: TableArgs) {
  return {
    organizationId: args.organizationId,
    collectionId: args.tableId,
    personId: args.personId,
  }
}
