import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { normalizeExpectedVersion } from "../collections/input"
import {
  boundedNumber,
  type JoriToolRequest,
  optionalNumber,
  optionalString,
  readRecord,
  requiredObject,
  requiredString,
} from "../shared/input"
import { visibilityFromScopeInput } from "../visibility/schema"

const tableTools = new Set([
  "search_tables",
  "create_table",
  "read_table",
  "list_table_rows",
  "insert_table_row",
  "update_table_row",
  "delete_table_row",
  "share_table",
])

export function isJoriTableTool(tool: string) {
  return tableTools.has(tool)
}

type TablePrincipal = { organizationId: string; personId: Id<"persons"> }

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
        visibility: visibilityFromScopeInput(args.scope),
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
        keyedBy: "name",
      })
    case "share_table":
      return await ctx.runMutation(internal.tables.share.mint, {
        ...principal,
        tableId: requiredTableId(args.tableId),
        expiresInHours: optionalNumber(args.expiresInHours),
      })
    default:
      return await callJoriTableRowTool(ctx, principal, request.tool, args)
  }
}

async function callJoriTableRowTool(
  ctx: ActionCtx,
  principal: TablePrincipal,
  tool: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (tool) {
    case "insert_table_row":
      return await ctx.runMutation(internal.tables.rows.insert, {
        ...principal,
        tableId: requiredTableId(args.tableId),
        values: requiredObject(args.values, "values"),
        keyedBy: "name",
      })
    case "update_table_row":
      return await ctx.runMutation(internal.tables.rows.update, {
        ...principal,
        tableId: requiredTableId(args.tableId),
        rowId: requiredRowId(args.rowId),
        values: requiredObject(args.values, "values"),
        expectedVersion: normalizeExpectedVersion(args.expectedVersion),
        keyedBy: "name",
      })
    case "delete_table_row":
      return await ctx.runMutation(internal.tables.rows.remove, {
        ...principal,
        tableId: requiredTableId(args.tableId),
        rowId: requiredRowId(args.rowId),
        expectedVersion: normalizeExpectedVersion(args.expectedVersion),
      })
    default:
      throw new Error(`Unknown Jori table tool: ${tool}`)
  }
}

function requiredTableId(value: unknown) {
  return requiredString(value, "tableId") as Id<"collections">
}

function requiredRowId(value: unknown) {
  return requiredString(value, "rowId") as Id<"documents">
}
