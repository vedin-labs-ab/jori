import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../convex/_generated/api"

export type TableListResult = NonNullable<
  FunctionReturnType<typeof api.tables.console.list>
>

export type TableSummary = Extract<
  TableListResult,
  { status: "ready" }
>["tables"][number]

type TableDetailResult = NonNullable<
  FunctionReturnType<typeof api.tables.console.get>
>

export type TableDetail = NonNullable<
  Extract<TableDetailResult, { status: "ready" }>["table"]
>

export type TableColumn = TableDetail["columns"][number]

export type TableRowPage = FunctionReturnType<
  typeof api.tables.console.pageRows
>

export type TableRow = TableRowPage["page"][number]

export type RowPlacement = "above" | "below"

/** Places an insert beside an existing row; absent, inserts append. */
export type RowInsertAnchor = {
  rowId: TableRow["rowId"]
  placement: RowPlacement
}

/** Rows fetched per page while the grid scrolls: large enough that a fast
 *  scroll rarely outruns loading, small enough to keep each read cheap. */
export const rowPageSize = 150
