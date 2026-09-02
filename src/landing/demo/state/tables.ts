import { type TableRow } from "@/shared/console/tables/types"
import { type DemoTable } from "../fixtures/types"
import { type DemoAction, type DemoState } from "./types"

export function reduceTables(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "commitCell":
      return patchTable(state, action.tableId, action.at, (table) => ({
        ...table,
        rows: table.rows.map((row) =>
          row.rowId === action.rowId
            ? committed(row, action.columnId, action.value, action.at)
            : row
        ),
      }))
    case "insertRow":
      return patchTable(state, action.tableId, action.at, (table) => ({
        ...table,
        rows: inserted(table.rows, action.row, action.anchor),
      }))
    case "deleteRow":
      return patchTable(state, action.tableId, action.at, (table) => ({
        ...table,
        rows: table.rows.filter((row) => row.rowId !== action.rowId),
      }))
    case "setColumns": {
      const kept = new Set(action.columns.map((column) => column.id))

      return patchTable(state, action.tableId, action.at, (table) => ({
        ...table,
        columns: action.columns,
        rows: table.rows.map((row) => ({
          ...row,
          values: Object.fromEntries(
            Object.entries(row.values).filter(([columnId]) =>
              kept.has(columnId)
            )
          ),
        })),
      }))
    }
    default:
      return state
  }
}

function patchTable(
  state: DemoState,
  tableId: string,
  at: number,
  patch: (table: DemoTable) => DemoTable
): DemoState {
  return {
    ...state,
    materials: state.materials.map((material) =>
      material.kind === "table" && material.id === tableId
        ? { ...patch(material), updatedAt: at }
        : material
    ),
  }
}

/** A cleared cell leaves the row rather than storing nothing. */
function committed(
  row: TableRow,
  columnId: string,
  value: unknown,
  at: number
): TableRow {
  const { [columnId]: _previous, ...rest } = row.values

  return {
    ...row,
    values:
      value === undefined || value === null
        ? rest
        : { ...rest, [columnId]: value },
    version: row.version + 1,
    updatedAt: at,
  }
}

function inserted(
  rows: TableRow[],
  row: TableRow,
  anchor: Extract<DemoAction, { type: "insertRow" }>["anchor"]
) {
  const index =
    anchor === undefined
      ? -1
      : rows.findIndex((candidate) => candidate.rowId === anchor.rowId)

  if (anchor === undefined || index === -1) {
    return [...rows, row]
  }

  const at = anchor.placement === "above" ? index : index + 1

  return [...rows.slice(0, at), row, ...rows.slice(at)]
}
