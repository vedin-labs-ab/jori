import { type TableColumn } from "@contracts/tables/columns"

/** Compact text a grid cell displays; shared by the console grid and the
 *  read-only share view so a table reads the same on both. */
export function displayCellText(column: TableColumn, value: unknown) {
  if (value === undefined) {
    return ""
  }

  if (column.type === "json") {
    return JSON.stringify(value) ?? ""
  }

  return String(value)
}
