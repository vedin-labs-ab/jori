import { isRecord } from "../json"
import { assertJsonSerializable } from "../json/stable"
import { validateJsonSchemaValue } from "../schema/validate"
import { type TableColumn, tableLimits } from "./columns"

// Row values are documents keyed by column key. Every write validates the
// whole document against the table's columns, so stored rows always match
// the schema readers see.

export function assertRowValues(input: {
  columns: TableColumn[]
  values: unknown
  label: string
}) {
  const values = input.values

  if (!isRecord(values)) {
    throw new Error(`${input.label} values must be an object.`)
  }

  assertJsonSerializable({
    label: `${input.label} values`,
    maxBytes: tableLimits.maxRowBytes,
    value: values,
  })

  const issues = [
    ...unknownKeyIssues(input.columns, values),
    ...input.columns.flatMap((column) =>
      columnIssues(column, values[column.key])
    ),
  ]

  if (issues.length > 0) {
    throw new Error(`${input.label}: ${issues.slice(0, 5).join("; ")}`)
  }
}

/** Merge a patch into the current values: entries replace their column's
 *  value wholesale, null clears it. The result still needs assertRowValues. */
export function applyRowPatch(current: unknown, patch: unknown) {
  if (!isRecord(patch)) {
    throw new Error("Row values must be an object.")
  }

  const values: Record<string, unknown> = isRecord(current)
    ? { ...current }
    : {}

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete values[key]
    } else {
      values[key] = value
    }
  }

  return values
}

function unknownKeyIssues(
  columns: TableColumn[],
  values: Record<string, unknown>
) {
  const keys = new Set(columns.map((column) => column.key))

  return Object.keys(values)
    .filter((key) => !keys.has(key))
    .map((key) => `${key} is not a column`)
}

function columnIssues(column: TableColumn, value: unknown): string[] {
  if (value === undefined) {
    return column.required === true ? [`${column.key} is required`] : []
  }

  // Null means "clear this column" in row patches, so stored values never
  // hold null: an absent column is the one empty state.
  if (value === null) {
    return [`${column.key} cannot be null; omit the column instead`]
  }

  switch (column.type) {
    case "boolean":
      return typeof value === "boolean" ? [] : [typeIssue(column)]
    case "integer":
      return Number.isInteger(value) ? [] : [typeIssue(column)]
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? []
        : [typeIssue(column)]
    case "string":
      return typeof value === "string" ? [] : [typeIssue(column)]
    case "json":
      return jsonColumnIssues(column, value)
  }
}

function jsonColumnIssues(column: TableColumn, value: unknown) {
  if (column.schema === undefined) {
    return []
  }

  return validateJsonSchemaValue(column.schema, value, column.key).map(
    (issue) => `${issue.path} ${issue.message}`
  )
}

function typeIssue(column: TableColumn) {
  return `${column.key} must be ${column.type === "integer" ? "an" : "a"} ${column.type}`
}
