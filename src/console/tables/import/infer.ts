import { assertJsonSchemaValue } from "@contracts/schema/validate"
import {
  type TableColumn,
  type TableColumnType,
  tableLimits,
} from "@contracts/tables/columns"
import { compileTableSchema } from "@contracts/tables/compile"
import { parseCsv } from "@/lib/csv"

// A CSV file becomes a brand-new table: column keys are slugged from the
// header, each column's type and required flag are deduced from the data,
// and every row is coerced and validated before anything is created.

/** One row that could not be converted; `line` is 1-based in the file. */
export type CsvRowIssue = { line: number; message: string }

/** One importable row, keeping its 1-based file line for previews. */
export type CsvRow = { line: number; values: Record<string, unknown> }

export type CsvTablePlan =
  | { status: "error"; message: string }
  | {
      status: "invalid"
      columns: TableColumn[]
      issues: CsvRowIssue[]
      total: number
    }
  | { status: "ready"; columns: TableColumn[]; rows: CsvRow[] }

type CsvRecord = { fields: string[]; line: number }

/** Deduce a full table from CSV text: columns from the header and data,
 *  rows coerced to the deduced types. Blank records are skipped. */
export function planCsvTable(text: string): CsvTablePlan {
  let parsed: string[][]

  try {
    parsed = parseCsv(text)
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not parse the file.",
    }
  }

  const [header, ...body] = parsed

  if (header === undefined) {
    return { status: "error", message: "The file is empty." }
  }

  if (header.length > tableLimits.maxColumns) {
    return {
      status: "error",
      message: `Tables can define at most ${tableLimits.maxColumns} columns; the file has ${header.length}.`,
    }
  }

  const records = body
    // The header is line 1, so the first data record is line 2.
    .map((fields, index) => ({ fields, line: index + 2 }))
    .filter((record) => record.fields.some((field) => field.trim() !== ""))

  if (records.length === 0) {
    return { status: "error", message: "The file has no data rows." }
  }

  return planRows(inferColumns(header, records), records)
}

/** Table name suggested by a file name: extension off, separators to
 *  spaces, first letter capitalized. */
export function deriveTableName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]*$/, "")
  const cleaned = stem
    .replaceAll(/[_\-.]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()

  if (cleaned === "") {
    return "Imported table"
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function inferColumns(header: string[], records: CsvRecord[]): TableColumn[] {
  const keys = dedupeKeys(header.map(slugColumnKey))

  return header.map((cell, index) => {
    const key = keys[index] ?? `column_${index + 1}`
    const filled = records
      .map((record) => (record.fields[index] ?? "").trim())
      .filter((value) => value !== "")

    return {
      key,
      name: cell.trim() === "" ? key : cell.trim(),
      type: inferColumnType(filled),
      // A column with a value in every record is required; empty cells
      // anywhere make it optional.
      ...(filled.length === records.length ? { required: true } : {}),
    }
  })
}

/** Contracts-safe key for a header cell: lowercased, non-alphanumeric runs
 *  collapsed to underscores, forced to start with a letter. */
export function slugColumnKey(cell: string): string {
  const slug = cell
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "")

  if (slug === "") {
    return "column"
  }

  return /^[a-z]/.test(slug) ? slug : `c_${slug}`
}

/** Keep keys within the 64-character contracts limit and unique, suffixing
 *  collisions with `_2`, `_3`, … in header order. */
function dedupeKeys(keys: string[]): string[] {
  const taken = new Set<string>()

  return keys.map((key) => {
    let candidate = key.slice(0, 64)

    for (let suffix = 2; taken.has(candidate); suffix += 1) {
      const tail = `_${suffix}`

      candidate = `${key.slice(0, 64 - tail.length)}${tail}`
    }

    taken.add(candidate)

    return candidate
  })
}

/** Narrowest type every non-empty value fits: boolean, then integer, then
 *  float, falling back to text. An all-empty column is optional text. */
function inferColumnType(filled: string[]): TableColumnType {
  if (filled.length === 0) {
    return "string"
  }

  if (filled.every((value) => /^(?:true|false)$/i.test(value))) {
    return "boolean"
  }

  if (filled.every((value) => Number.isFinite(Number(value)))) {
    return filled.every((value) => Number.isInteger(Number(value)))
      ? "integer"
      : "float"
  }

  return "string"
}

function planRows(columns: TableColumn[], records: CsvRecord[]): CsvTablePlan {
  const rows: CsvRow[] = []
  const issues: CsvRowIssue[] = []
  const schema = compileTableSchema(columns)

  for (const record of records) {
    const built = buildRow(columns, schema, record.fields)

    if (typeof built === "string") {
      issues.push({ line: record.line, message: built })
    } else {
      rows.push({ line: record.line, values: built })
    }
  }

  if (issues.length > 0) {
    return { status: "invalid", columns, issues, total: records.length }
  }

  return { status: "ready", columns, rows }
}

function buildRow(
  columns: TableColumn[],
  schema: ReturnType<typeof compileTableSchema>,
  fields: string[]
): Record<string, unknown> | string {
  if (fields.length > columns.length) {
    return `Has ${fields.length} fields where the header has ${columns.length}.`
  }

  const values: Record<string, unknown> = {}

  for (const [index, column] of columns.entries()) {
    const value = coerceCell(column.type, fields[index] ?? "")

    if (value !== undefined) {
      values[column.key] = value
    }
  }

  try {
    assertJsonSchemaValue({ schema, value: values, label: "Row" })
  } catch (error) {
    return error instanceof Error ? error.message : "Failed validation."
  }

  return values
}

/** Typed value for one cell; the type was deduced from these very values,
 *  so conversion cannot fail. Empty cells stay out of the document. */
function coerceCell(type: TableColumnType, field: string): unknown {
  const trimmed = field.trim()

  if (trimmed === "") {
    return undefined
  }

  switch (type) {
    case "string":
      return field
    case "boolean":
      return trimmed.toLowerCase() === "true"
    case "float":
    case "integer":
      return Number(trimmed)
  }
}
