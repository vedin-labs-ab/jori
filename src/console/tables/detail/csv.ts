import { assertRowValues } from "@contracts/tables/rows"
import { parseCsv, serializeCsv } from "@/lib/csv"
import { type TableColumn } from "../types"
import { parseCellText } from "./cells"

// CSV import runs entirely on the client: the file is parsed, its header
// mapped to columns, and every row coerced and validated against the same
// contracts rules the backend applies. An import either starts with every
// row known-good or does not start at all.

/** One row that could not be converted; `line` is 1-based in the file. */
export type CsvRowIssue = { line: number; message: string }

export type CsvPlan =
  | { status: "error"; message: string }
  | { status: "invalid"; issues: CsvRowIssue[]; total: number }
  | { status: "ready"; rows: Record<string, unknown>[] }

export function planCsvImport(columns: TableColumn[], text: string): CsvPlan {
  let records: string[][]

  try {
    records = parseCsv(text)
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not parse the file.",
    }
  }

  const [header, ...body] = records

  if (header === undefined) {
    return { status: "error", message: "The file is empty." }
  }

  const mapping = mapHeader(columns, header)

  if (typeof mapping === "string") {
    return { status: "error", message: mapping }
  }

  return planRows(columns, mapping, body)
}

/** CSV text for the whole table: column keys as the header, columns in
 *  definition order, absent cells empty. */
export function buildCsvExport(
  columns: TableColumn[],
  rows: { values: Record<string, unknown> }[]
) {
  return serializeCsv([
    columns.map((column) => column.key),
    ...rows.map((row) =>
      columns.map((column) => {
        const value = row.values[column.key]

        return value === undefined ? "" : String(value)
      })
    ),
  ])
}

/** Match each header cell to a column by key or display name,
 *  case-insensitively; a key match wins over a name match. Unmatched or
 *  duplicated headers and missing required columns fail the whole file. */
function mapHeader(
  columns: TableColumn[],
  header: string[]
): TableColumn[] | string {
  const byLabel = new Map<string, TableColumn>()

  for (const column of columns) {
    byLabel.set(column.name.trim().toLowerCase(), column)
  }

  for (const column of columns) {
    byLabel.set(column.key.toLowerCase(), column)
  }

  const mapped: TableColumn[] = []
  const seen = new Set<string>()
  const unmatched: string[] = []

  for (const cell of header) {
    const column = byLabel.get(cell.trim().toLowerCase())

    if (column === undefined) {
      unmatched.push(cell.trim() === "" ? "(empty)" : cell.trim())

      continue
    }

    if (seen.has(column.key)) {
      return `Column "${column.key}" appears more than once in the header.`
    }

    seen.add(column.key)
    mapped.push(column)
  }

  if (unmatched.length > 0) {
    return `No matching column for: ${unmatched.join(", ")}. Header cells must match a column key or name.`
  }

  const missing = columns
    .filter((column) => column.required === true && !seen.has(column.key))
    .map((column) => column.key)

  if (missing.length > 0) {
    return `The header is missing required ${missing.length === 1 ? "column" : "columns"}: ${missing.join(", ")}.`
  }

  return mapped
}

function planRows(
  columns: TableColumn[],
  mapping: TableColumn[],
  body: string[][]
): CsvPlan {
  const rows: Record<string, unknown>[] = []
  const issues: CsvRowIssue[] = []

  body.forEach((record, index) => {
    if (record.every((field) => field.trim() === "")) {
      return
    }

    const built = buildRow(columns, mapping, record)

    if (typeof built === "string") {
      // The header is line 1, so the first data record is line 2.
      issues.push({ line: index + 2, message: built })
    } else {
      rows.push(built)
    }
  })

  if (issues.length > 0) {
    return { status: "invalid", issues, total: rows.length + issues.length }
  }

  if (rows.length === 0) {
    return { status: "error", message: "The file has no data rows." }
  }

  return { status: "ready", rows }
}

function buildRow(
  columns: TableColumn[],
  mapping: TableColumn[],
  record: string[]
): Record<string, unknown> | string {
  if (record.length > mapping.length) {
    return `Has ${record.length} fields where the header has ${mapping.length}.`
  }

  const values: Record<string, unknown> = {}

  for (const [index, column] of mapping.entries()) {
    const parsed = parseCellText(column, record[index] ?? "")

    if (!parsed.ok) {
      return `${column.key}: ${parsed.error}`
    }

    if (parsed.value !== undefined) {
      values[column.key] = parsed.value
    }
  }

  try {
    assertRowValues({ columns, values, label: "Row" })
  } catch (error) {
    return error instanceof Error ? error.message : "Failed validation."
  }

  return values
}
