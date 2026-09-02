import { type TableColumn } from "./types"

// Cell edits travel as text; these helpers translate between the text a
// cell shows and the typed value the column stores. An empty input clears
// the cell (rows never store null), which required columns reject up front.

type CellParse = { ok: true; value: unknown } | { ok: false; error: string }

/** Parsed value for a cell input; `value: undefined` means "clear". */
export function parseCellText(column: TableColumn, text: string): CellParse {
  const trimmed = text.trim()

  if (trimmed === "") {
    return column.required === true
      ? { ok: false, error: `${column.name} is required.` }
      : { ok: true, value: undefined }
  }

  switch (column.type) {
    case "string":
      return { ok: true, value: text }
    case "float":
      return parseNumberText(trimmed, false)
    case "integer":
      return parseNumberText(trimmed, true)
    case "boolean":
      return parseBooleanText(trimmed)
  }
}

/** Seed text for editing an existing cell value. */
export function formatCellText(column: TableColumn, value: unknown) {
  if (value === undefined) {
    return ""
  }

  if (column.type === "string" && typeof value === "string") {
    return value
  }

  return String(value)
}

/** Text (and checkbox) drafts for a new row, keyed by column id. */
export type RowDraft = Record<string, string | boolean>

/** Assemble insert values from an add-row draft: parse failures name their
 *  column, and empty optional cells stay out of the document. */
export function buildRowValues(
  columns: TableColumn[],
  draft: RowDraft
):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  const values: Record<string, unknown> = {}

  for (const column of columns) {
    const entry = draft[column.id]

    if (column.type === "boolean") {
      values[column.id] = entry === true

      continue
    }

    const parsed = parseCellText(column, typeof entry === "string" ? entry : "")

    if (!parsed.ok) {
      return { ok: false, error: `${column.name}: ${parsed.error}` }
    }

    if (parsed.value !== undefined) {
      values[column.id] = parsed.value
    }
  }

  return { ok: true, values }
}

function parseNumberText(trimmed: string, requireInteger: boolean): CellParse {
  const value = Number(trimmed)

  if (!Number.isFinite(value)) {
    return { ok: false, error: "Enter a number." }
  }

  if (requireInteger && !Number.isInteger(value)) {
    return { ok: false, error: "Enter a whole number." }
  }

  return { ok: true, value }
}

function parseBooleanText(trimmed: string): CellParse {
  if (trimmed === "true" || trimmed === "false") {
    return { ok: true, value: trimmed === "true" }
  }

  return { ok: false, error: "Enter true or false." }
}
