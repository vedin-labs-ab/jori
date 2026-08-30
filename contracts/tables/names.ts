import { isRecord } from "../json"
import { type TableColumn } from "./columns"

// The agent surface addresses columns by name — the only column identity
// the product exposes. Names resolve to hidden column ids on the way in
// and label row values on the way out; names are unique per table
// (case-insensitively), so resolution is unambiguous.

/** Name-keyed row values translated to the id keys rows store; an unknown
 *  name errors with the table's actual columns. */
export function resolveNamedValues(
  columns: TableColumn[],
  values: unknown
): Record<string, unknown> {
  if (!isRecord(values)) {
    throw new Error("Row values must be an object keyed by column name.")
  }

  const idsByName = new Map(
    columns.map((column) => [column.name.toLowerCase(), column.id])
  )
  const resolved: Record<string, unknown> = {}

  for (const [name, value] of Object.entries(values)) {
    const columnId = idsByName.get(name.trim().toLowerCase())

    if (columnId === undefined) {
      throw new Error(unknownColumnMessage(columns, name))
    }

    resolved[columnId] = value
  }

  return resolved
}

/** Stored id-keyed row values labeled by column name for responses; values
 *  of deleted columns (awaiting their scrub) stay hidden. */
export function nameRowValues(
  columns: TableColumn[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const named: Record<string, unknown> = {}

  for (const column of columns) {
    const value = values[column.id]

    if (value !== undefined) {
      named[column.name] = value
    }
  }

  return named
}

function unknownColumnMessage(columns: TableColumn[], name: string) {
  if (columns.length === 0) {
    return `Unknown column "${name}": the table has no columns yet.`
  }

  const names = columns.map((column) => column.name).join(", ")

  return `Unknown column "${name}". Columns: ${names}.`
}
