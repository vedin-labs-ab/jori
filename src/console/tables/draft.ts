import { type TableColumnType } from "@contracts/tables/columns"
import {
  DecimalsArrowRight,
  Hash,
  type LucideIcon,
  SquareCheck,
  Type,
} from "lucide-react"
import { type TableColumn } from "./types"

/** A column being edited: locked drafts are existing columns, where only
 *  the display name may change; the rest describe columns being added. */
export type ColumnDraft = {
  id: string
  key: string
  name: string
  type: TableColumnType
  required: boolean
  locked: boolean
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

const columnKeyPattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/

export function newColumnDraft(): ColumnDraft {
  return {
    id: crypto.randomUUID(),
    key: "",
    name: "",
    type: "string",
    required: false,
    locked: false,
  }
}

export function draftsFromColumns(columns: TableColumn[]): ColumnDraft[] {
  return columns.map((column) => ({
    id: column.key,
    key: column.key,
    name: column.name,
    type: column.type,
    required: column.required === true,
    locked: true,
  }))
}

/** The payload `create`/`update` expect. Existing columns keep their type
 *  and required flag; only the display name follows the draft. */
export function draftsToColumns(
  drafts: ColumnDraft[],
  existing: TableColumn[]
) {
  const existingByKey = new Map(existing.map((column) => [column.key, column]))

  return drafts.map((draft) => {
    const current = draft.locked ? existingByKey.get(draft.key) : undefined

    if (current !== undefined) {
      return {
        ...current,
        name: draft.name.trim() === "" ? draft.key : draft.name,
      }
    }

    return {
      key: draft.key,
      name: draft.name.trim() === "" ? draft.key : draft.name,
      type: draft.type,
      ...(draft.required ? { required: true } : {}),
    }
  })
}

/** Columns payload for appending one optional column to an existing table,
 *  or the validation problem blocking it. New columns join optional so the
 *  server's additive evolution rules accept them. */
export function appendColumn(
  existing: TableColumn[],
  addition: { key: string; name: string; type: TableColumnType }
):
  | { ok: true; columns: ReturnType<typeof draftsToColumns> }
  | { ok: false; error: string } {
  const drafts = [
    ...draftsFromColumns(existing),
    { ...newColumnDraft(), ...addition },
  ]
  const issue = columnDraftsIssue(drafts)

  if (issue !== undefined) {
    return { ok: false, error: issue }
  }

  return { ok: true, columns: draftsToColumns(drafts, existing) }
}

/** Columns payload renaming one column's display name — the only column
 *  detail the evolution rules let an existing column change. A blank name
 *  falls back to the key. */
export function renameColumn(
  existing: TableColumn[],
  key: string,
  name: string
) {
  return existing.map((column) =>
    column.key === key
      ? { ...column, name: name.trim() === "" ? column.key : name }
      : column
  )
}

export type TableFormErrors = { name?: string; columns?: string }

/** Errors for a table dialog submit attempt. Dialogs show these only after
 *  a submit and clear a field's error as soon as it gets new input. */
export function validateTableForm(
  name: string,
  drafts: ColumnDraft[]
): TableFormErrors {
  return {
    name: name.trim() === "" ? "Give the table a name." : undefined,
    columns: columnDraftsIssue(drafts),
  }
}

/** First problem that blocks submitting the drafts, if any. */
export function columnDraftsIssue(drafts: ColumnDraft[]) {
  if (drafts.length === 0) {
    return "Add at least one column."
  }

  const keys = new Set<string>()

  for (const draft of drafts) {
    if (!columnKeyPattern.test(draft.key)) {
      return draft.key.trim() === ""
        ? "Every column needs a key."
        : `Column key "${draft.key}" must start with a letter and use letters, numbers, or underscores.`
    }

    if (keys.has(draft.key)) {
      return `Duplicate column key "${draft.key}".`
    }

    keys.add(draft.key)
  }

  return undefined
}
