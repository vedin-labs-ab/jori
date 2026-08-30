import { isRecord } from "../json"
import { assertJsonSerializable } from "../json/stable"

// A table is typed by its column schema: an ordered list of columns, each
// with a hidden stable id, a user-facing name, and a value type. Rows are
// documents holding values keyed by column id, validated against these
// columns on every write. Names behave like CSV headers — freely renamable
// and the only column identity ever shown — with one rule extra: unique
// within the table, ignoring case, so name-based addressing is unambiguous.

export type TableColumnType = "boolean" | "float" | "integer" | "string"

export type TableColumn = {
  id: string
  name: string
  type: TableColumnType
  required?: boolean
}

export const tableLimits = {
  maxColumns: 64,
  maxColumnsBytes: 64 * 1024,
  maxColumnNameLength: 120,
  maxRowBytes: 64 * 1024,
}

const columnTypes = new Set<TableColumnType>([
  "boolean",
  "float",
  "integer",
  "string",
])

/** Ids double as row-value field names, so they must stay valid Convex
 *  object keys; pre-rename column keys already match this shape. */
const columnIdPattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/

/** A fresh hidden column id; generated wherever a column is born and never
 *  shown anywhere in the product. */
export function newColumnId(): string {
  return `c_${crypto.randomUUID().replaceAll("-", "")}`
}

/** TEMPORARY: columns as stored before the key→id rename. The one-shot
 *  migration (convex/tables/migrate.ts) stamps `id` from `key`; delete
 *  this shape and readStoredColumns with it, and tighten the validator in
 *  convex/collections/schema.ts, once both environments are stamped. */
export type StoredTableColumn = {
  id?: string
  key?: string
  name: string
  type: TableColumnType
  required?: boolean
}

/** TEMPORARY companion to StoredTableColumn: reads a legacy key as the id. */
export function readStoredColumns(columns: StoredTableColumn[]): TableColumn[] {
  return columns.map(({ key, ...column }) => ({
    ...column,
    id: column.id ?? key ?? newColumnId(),
  }))
}

export function normalizeTableColumns(value: unknown): TableColumn[] {
  if (!Array.isArray(value)) {
    throw new Error("Table columns must be an array.")
  }

  if (value.length > tableLimits.maxColumns) {
    throw new Error(
      `Tables can define at most ${tableLimits.maxColumns} columns.`
    )
  }

  const seen = { ids: new Set<string>(), names: new Set<string>() }
  const columns = value.map((column) => normalizeColumn(column, seen))

  assertJsonSerializable({
    label: "Table columns",
    maxBytes: tableLimits.maxColumnsBytes,
    value: columns,
  })

  return columns
}

/** Columns evolve by id, and a matched column keeps its type forever —
 *  create a new column for a different type. Renames, required toggles,
 *  additions, and removals are legal shapes; their data-dependent rules
 *  (required needs every row filled, removals scrub row values) live where
 *  rows are reachable, in convex/tables/records.ts. */
export function assertColumnEvolution(
  current: TableColumn[],
  next: TableColumn[]
) {
  const nextById = new Map(next.map((column) => [column.id, column]))

  for (const column of current) {
    const candidate = nextById.get(column.id)

    if (candidate !== undefined && candidate.type !== column.type) {
      throw new Error(
        `Column ${column.name} keeps its ${column.type} type; add a new column for a different type.`
      )
    }
  }
}

function normalizeColumn(
  value: unknown,
  seen: { ids: Set<string>; names: Set<string> }
): TableColumn {
  if (!isRecord(value)) {
    throw new Error("Table columns must be objects.")
  }

  const id = normalizeColumnId(value.id)
  const name = normalizeColumnName(value.name)
  const fold = name.toLowerCase()

  if (seen.ids.has(id)) {
    throw new Error(`Duplicate table column id: ${id}`)
  }

  if (seen.names.has(fold)) {
    throw new Error(`A column named "${name}" already exists.`)
  }

  seen.ids.add(id)
  seen.names.add(fold)

  return {
    id,
    name,
    type: normalizeColumnType(value.type, name),
    ...(value.required === true ? { required: true } : {}),
  }
}

function normalizeColumnId(value: unknown) {
  if (value === undefined) {
    return newColumnId()
  }

  if (typeof value !== "string" || !columnIdPattern.test(value)) {
    throw new Error("Column ids are internal; omit them for new columns.")
  }

  return value
}

function normalizeColumnName(value: unknown) {
  const name =
    typeof value === "string"
      ? value.trim().slice(0, tableLimits.maxColumnNameLength).trim()
      : ""

  if (name === "") {
    throw new Error("Every column needs a name.")
  }

  return name
}

function normalizeColumnType(value: unknown, name: string): TableColumnType {
  if (typeof value !== "string" || !columnTypes.has(value as TableColumnType)) {
    throw new Error(
      `Column ${name} must use one of: ${[...columnTypes].join(", ")}.`
    )
  }

  return value as TableColumnType
}
