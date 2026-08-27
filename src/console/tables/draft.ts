import { type TableColumnType } from "@contracts/tables/columns"
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
  { label: "Number", value: "number" },
  { label: "Integer", value: "integer" },
  { label: "Boolean", value: "boolean" },
  { label: "JSON", value: "json" },
] as const satisfies readonly { label: string; value: TableColumnType }[]

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

/** The payload `create`/`update` expect. Existing columns keep their type,
 *  required flag, and schema; only the display name follows the draft. */
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
