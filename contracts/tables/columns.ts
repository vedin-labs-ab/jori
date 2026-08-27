import { isRecord } from "../json"
import { assertJsonSerializable, stableJson } from "../json/stable"
import {
  assertSupportedJsonSchema,
  normalizeJsonValueSchema,
} from "../schema/normalize"
import { type JsonSchemaObject } from "../schema/validate"

// A table is typed by its column schema: an ordered list of columns, each
// with a stable key, a display name, and a value type. Rows are documents
// holding values keyed by column key, validated against these columns on
// every write.

export type TableColumnType =
  | "boolean"
  | "integer"
  | "json"
  | "number"
  | "string"

export type TableColumn = {
  key: string
  name: string
  type: TableColumnType
  required?: boolean
  /** Optional JSON Schema for the values of a json column. */
  schema?: JsonSchemaObject
}

export const tableLimits = {
  maxColumns: 64,
  maxColumnsBytes: 64 * 1024,
  maxRowBytes: 64 * 1024,
}

const columnTypes = new Set<TableColumnType>([
  "boolean",
  "integer",
  "json",
  "number",
  "string",
])
const columnKeyPattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/

export function normalizeTableColumns(value: unknown): TableColumn[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Table columns must be a non-empty array.")
  }

  if (value.length > tableLimits.maxColumns) {
    throw new Error(
      `Tables can define at most ${tableLimits.maxColumns} columns.`
    )
  }

  const keys = new Set<string>()
  const columns = value.map((column) => normalizeColumn(column, keys))

  assertJsonSerializable({
    label: "Table columns",
    maxBytes: tableLimits.maxColumnsBytes,
    value: columns,
  })

  return columns
}

/** Column evolution is additive only: existing columns keep their key,
 *  type, required flag, and schema (display names may change), and new
 *  columns must be optional so existing rows stay valid. */
export function assertColumnEvolution(
  current: TableColumn[],
  next: TableColumn[]
) {
  const nextByKey = new Map(next.map((column) => [column.key, column]))

  for (const column of current) {
    const candidate = nextByKey.get(column.key)

    if (candidate === undefined) {
      throw new Error(`Column ${column.key} cannot be removed.`)
    }

    if (
      candidate.type !== column.type ||
      (candidate.required === true) !== (column.required === true) ||
      stableJson(candidate.schema) !== stableJson(column.schema)
    ) {
      throw new Error(`Column ${column.key} can only change its display name.`)
    }
  }

  const currentKeys = new Set(current.map((column) => column.key))

  for (const column of next) {
    if (!currentKeys.has(column.key) && column.required === true) {
      throw new Error(
        `New column ${column.key} must be optional so existing rows stay valid.`
      )
    }
  }
}

function normalizeColumn(value: unknown, keys: Set<string>): TableColumn {
  if (!isRecord(value)) {
    throw new Error("Table columns must be objects.")
  }

  const key = normalizeColumnKey(value.key)
  const type = normalizeColumnType(value.type, key)

  if (keys.has(key)) {
    throw new Error(`Duplicate table column key: ${key}`)
  }

  keys.add(key)

  return {
    key,
    name: normalizeColumnName(value.name, key),
    type,
    ...(value.required === true ? { required: true } : {}),
    ...normalizeColumnSchema(value.schema, type, key),
  }
}

function normalizeColumnKey(value: unknown) {
  if (typeof value !== "string" || !columnKeyPattern.test(value)) {
    throw new Error(
      "Column keys must start with a letter and use letters, numbers, or underscores."
    )
  }

  return value
}

function normalizeColumnName(value: unknown, key: string) {
  const name = typeof value === "string" ? value.trim() : ""

  if (name === "") {
    return key
  }

  return name.slice(0, 120)
}

function normalizeColumnType(value: unknown, key: string): TableColumnType {
  if (typeof value !== "string" || !columnTypes.has(value as TableColumnType)) {
    throw new Error(
      `Column ${key} must use one of: ${[...columnTypes].join(", ")}.`
    )
  }

  return value as TableColumnType
}

function normalizeColumnSchema(
  value: unknown,
  type: TableColumnType,
  key: string
) {
  if (value === undefined || value === null) {
    return {}
  }

  if (type !== "json") {
    throw new Error(`Column ${key} carries a schema but is not a json column.`)
  }

  const schema = normalizeJsonValueSchema(value, `Column ${key} schema`)

  assertSupportedJsonSchema(schema, `Column ${key} schema`)

  return { schema }
}
