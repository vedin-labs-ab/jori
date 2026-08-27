import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  normalizeExpectedVersion,
  normalizeMaterialScope,
} from "../materials/input"
import {
  boundedNumber,
  type JoriToolRequest,
  optionalString,
  readRecord,
  requiredObject,
  requiredString,
} from "../shared/input"

const tableTools = new Set([
  "search_tables",
  "create_table",
  "read_table",
  "list_table_rows",
  "insert_table_row",
  "update_table_row",
  "delete_table_row",
])

export function isJoriTableTool(tool: string) {
  return tableTools.has(tool)
}

export async function callJoriTableTool(
  ctx: ActionCtx,
  execution: { organizationId: string; createdBy?: Id<"persons"> },
  request: JoriToolRequest
): Promise<unknown> {
  const args = readRecord(request.args)
  const personId = execution.createdBy

  if (personId === undefined) {
    throw new Error("Table tools require an authenticated execution user.")
  }

  const principal = { organizationId: execution.organizationId, personId }

  switch (request.tool) {
    case "search_tables":
      return await ctx.runQuery(internal.tables.queries.search, {
        ...principal,
        query: optionalString(args.query),
        includeArchived: args.includeArchived === true,
        limit: boundedNumber(args.limit, 25, 1, 100),
      })
    case "create_table":
      return await ctx.runMutation(internal.tables.records.create, {
        ...principal,
        name: requiredString(args.name, "name"),
        description: optionalString(args.description),
        scope: normalizeMaterialScope(args.scope),
        columns: args.columns,
      })
    case "read_table":
      return await ctx.runQuery(internal.tables.queries.read, {
        ...principal,
        tableId: requiredTableId(args.tableId),
      })
    case "list_table_rows":
      return await ctx.runQuery(internal.tables.rows.page, {
        ...principal,
        tableId: requiredTableId(args.tableId),
        paginationOpts: {
          numItems: boundedNumber(args.limit, 50, 1, 200),
          cursor: optionalString(args.cursor) ?? null,
        },
      })
    case "insert_table_row":
      return await ctx.runMutation(internal.tables.rows.insert, {
        ...principal,
        tableId: requiredTableId(args.tableId),
        values: requiredObject(args.values, "values"),
      })
    case "update_table_row":
      return await ctx.runMutation(internal.tables.rows.update, {
        ...principal,
        tableId: requiredTableId(args.tableId),
        rowId: requiredRowId(args.rowId),
        values: requiredObject(args.values, "values"),
        expectedVersion: normalizeExpectedVersion(args.expectedVersion),
      })
    case "delete_table_row":
      return await ctx.runMutation(internal.tables.rows.remove, {
        ...principal,
        tableId: requiredTableId(args.tableId),
        rowId: requiredRowId(args.rowId),
        expectedVersion: normalizeExpectedVersion(args.expectedVersion),
      })
    default:
      throw new Error(`Unknown Jori table tool: ${request.tool}`)
  }
}

function requiredTableId(value: unknown) {
  return requiredString(value, "tableId") as Id<"tables">
}

function requiredRowId(value: unknown) {
  return requiredString(value, "rowId") as Id<"tableRows">
}
