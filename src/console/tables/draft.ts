import { newColumnId, type TableColumnType } from "@contracts/tables/columns"
import {
  DecimalsArrowRight,
  Hash,
  type LucideIcon,
  SquareCheck,
  Type,
} from "lucide-react"
import { type TableColumn } from "./types"

/** What the column sheet edits: everything a column shows the user. The
 *  hidden id is generated on append and never surfaces. */
export type ColumnDraft = {
  name: string
  type: TableColumnType
  required: boolean
}

export const columnTypeOptions = [
  { label: "Text", value: "string" },
  { label: "Float", value: "float" },
  { label: "Integer", value: "integer" },
  { label: "Boolean", value: "boolean" },
] as const satisfies readonly { label: string; value: TableColumnType }[]

/** The one place a column type maps to its icon, shown wherever a column
 *  header names its type. */
export const columnTypeIcons: Record<TableColumnType, LucideIcon> = {
  boolean: SquareCheck,
  float: DecimalsArrowRight,
  integer: Hash,
  string: Type,
}

export function newColumnDraft(): ColumnDraft {
  return { name: "", type: "string", required: false }
}

type ColumnsResult =
  | { ok: true; columns: TableColumn[] }
  | { ok: false; error: string }

/** Columns payload appending one drafted column, or the validation problem
 *  blocking it. */
export function appendColumn(
  existing: TableColumn[],
  draft: ColumnDraft
): ColumnsResult {
  const issue = columnNameIssue(existing, draft.name)

  if (issue !== undefined) {
    return { ok: false, error: issue }
  }

  return {
    ok: true,
    columns: [
      ...existing,
      {
        id: newColumnId(),
        name: draft.name.trim(),
        type: draft.type,
        ...(draft.required ? { required: true as const } : {}),
      },
    ],
  }
}

/** Columns payload applying everything an existing column may change: its
 *  name, freely, and its required flag — the type is fixed for life. */
export function editColumn(
  existing: TableColumn[],
  columnId: string,
  draft: { name: string; required: boolean }
): ColumnsResult {
  const issue = columnNameIssue(existing, draft.name, columnId)

  if (issue !== undefined) {
    return { ok: false, error: issue }
  }

  return {
    ok: true,
    columns: existing.map((column) =>
      column.id === columnId
        ? {
            id: column.id,
            name: draft.name.trim(),
            type: column.type,
            ...(draft.required ? { required: true as const } : {}),
          }
        : column
    ),
  }
}

/** Columns payload deleting one column; the server removes its values from
 *  every row. */
export function removeColumn(
  existing: TableColumn[],
  columnId: string
): TableColumn[] {
  return existing.filter((column) => column.id !== columnId)
}

/** Names are the only column identity users see, so they behave like CSV
 *  headers with one rule extra: unique within the table, ignoring case. */
export function columnNameIssue(
  existing: TableColumn[],
  name: string,
  excludeColumnId?: string
) {
  const trimmed = name.trim()

  if (trimmed === "") {
    return "Give the column a name."
  }

  const fold = trimmed.toLowerCase()
  const clash = existing.find(
    (column) =>
      column.id !== excludeColumnId && column.name.toLowerCase() === fold
  )

  if (clash !== undefined) {
    return `A column named "${clash.name}" already exists.`
  }

  return undefined
}
