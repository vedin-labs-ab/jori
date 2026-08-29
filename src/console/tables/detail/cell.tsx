import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { displayCellText } from "@/shared/materials/cells"
import { type TableColumn, type TableRow } from "../types"
import { formatCellText, parseCellText } from "./cells"

export type CommitCell = (
  row: TableRow,
  key: string,
  value: unknown
) => Promise<boolean>

/** One grid cell: booleans toggle in place and text-like types edit
 *  inline. Every commit carries the row version. A cell spotlighted for a
 *  freshly inserted row opens in edit mode and reports when it settles. */
export function RowCell({
  column,
  disabled,
  onCommit,
  onSettle,
  row,
  spotlight = false,
}: {
  column: TableColumn
  disabled: boolean
  onCommit: CommitCell
  onSettle?: () => void
  row: TableRow
  spotlight?: boolean
}) {
  const value = row.values[column.key]

  if (column.type === "boolean") {
    return (
      <Checkbox
        aria-label={`${column.name} for this row`}
        checked={value === true}
        disabled={disabled}
        onCheckedChange={(checked) =>
          void onCommit(row, column.key, checked === true)
        }
      />
    )
  }

  return (
    <TextCell
      column={column}
      disabled={disabled}
      onCommit={onCommit}
      onSettle={onSettle}
      row={row}
      spotlight={spotlight}
    />
  )
}

function TextCell({
  column,
  disabled,
  onCommit,
  onSettle,
  row,
  spotlight,
}: {
  column: TableColumn
  disabled: boolean
  onCommit: CommitCell
  onSettle: (() => void) | undefined
  row: TableRow
  spotlight: boolean
}) {
  const value = row.values[column.key]
  const [draft, setDraft] = useState<string | undefined>(() =>
    spotlight && !disabled ? formatCellText(column, value) : undefined
  )

  // A spotlight raised after mount — the row menu's Edit cell — opens the
  // editor too; the initializer only covers freshly inserted rows.
  useEffect(() => {
    if (spotlight && !disabled) {
      setDraft((current) => current ?? formatCellText(column, value))
    }
  }, [column, disabled, spotlight, value])

  function close() {
    setDraft(undefined)
    onSettle?.()
  }

  async function commit(text: string) {
    if (text === formatCellText(column, value)) {
      close()

      return
    }

    const parsed = parseCellText(column, text)

    if (!parsed.ok) {
      toast.error(parsed.error)

      return
    }

    if (await onCommit(row, column.key, parsed.value)) {
      close()
    }
  }

  if (draft === undefined) {
    return (
      <CellButton
        disabled={disabled}
        label={`Edit ${column.name}`}
        onClick={() => setDraft(formatCellText(column, value))}
        text={displayCellText(value)}
      />
    )
  }

  return (
    <Input
      autoFocus
      aria-label={`${column.name} value`}
      className="h-7 min-w-24 px-1.5 text-xs"
      onBlur={(event) => void commit(event.target.value)}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          void commit(draft)
        }

        if (event.key === "Escape") {
          close()
        }
      }}
      value={draft}
    />
  )
}

function CellButton({
  disabled,
  label,
  onClick,
  text,
}: {
  disabled: boolean
  label: string
  onClick: () => void
  text: string
}) {
  return (
    <button
      aria-label={label}
      className="block w-full min-w-24 max-w-56 cursor-text truncate rounded-sm px-1 py-0.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default disabled:hover:bg-transparent"
      disabled={disabled}
      onClick={onClick}
      title={text}
      type="button"
    >
      {text === "" ? <span className="text-muted-foreground">—</span> : text}
    </button>
  )
}
