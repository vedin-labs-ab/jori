import { type KeyboardEvent, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { displayCellText } from "@/shared/cell"
import { formatCellText, parseCellText } from "../cells"
import { type TableColumn, type TableRow } from "../types"

export type CommitCell = (
  row: TableRow,
  columnId: string,
  value: unknown
) => Promise<boolean>

/** One grid cell: booleans toggle in place and text-like types edit
 *  inline. Every commit carries the row version. A cell spotlighted for a
 *  freshly inserted row opens in edit mode and reports when it settles;
 *  Tab commits and asks the row to advance to a neighboring cell. */
export function RowCell({
  column,
  disabled,
  onAdvance,
  onCommit,
  onSettle,
  row,
  spotlight = false,
}: {
  column: TableColumn
  disabled: boolean
  onAdvance?: (direction: 1 | -1) => void
  onCommit: CommitCell
  onSettle?: () => void
  row: TableRow
  spotlight?: boolean
}) {
  const value = row.values[column.id]

  if (column.type === "boolean") {
    return (
      <span className="flex h-full items-center px-3">
        <Checkbox
          aria-label={`${column.name} for this row`}
          checked={value === true}
          disabled={disabled}
          onCheckedChange={(checked) =>
            void onCommit(row, column.id, checked === true)
          }
        />
      </span>
    )
  }

  return (
    <TextCell
      column={column}
      disabled={disabled}
      onAdvance={onAdvance}
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
  onAdvance,
  onCommit,
  onSettle,
  row,
  spotlight,
}: {
  column: TableColumn
  disabled: boolean
  onAdvance: ((direction: 1 | -1) => void) | undefined
  onCommit: CommitCell
  onSettle: (() => void) | undefined
  row: TableRow
  spotlight: boolean
}) {
  const value = row.values[column.id]
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

  const committing = useRef<string>(undefined)

  useUnmountCommit({ column, committing, draft, onCommit, row, value })

  function close() {
    setDraft(undefined)
    onSettle?.()
  }

  async function commit(text: string) {
    if (text === formatCellText(column, value)) {
      close()

      return true
    }

    const parsed = parseCellText(column, text)

    if (!parsed.ok) {
      toast.error(parsed.error)

      return false
    }

    committing.current = text

    try {
      if (await onCommit(row, column.id, parsed.value)) {
        close()

        return true
      }

      return false
    } finally {
      committing.current = undefined
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

  // The editor IS the cell: no chrome of its own, filling the cell to its
  // edges with the ring drawn inset along them, and the text sitting
  // exactly where the resting cell shows it.
  return (
    <Input
      autoFocus
      aria-label={`${column.name} value`}
      className="h-full min-w-24 rounded-none border-0 bg-transparent px-3 text-xs shadow-none ring-inset focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-transparent"
      onBlur={(event) => void commit(event.target.value)}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) =>
        handleEditorKey(event, { close, commit, onAdvance })
      }
      value={draft}
    />
  )
}

/** An editor that unmounts mid-edit — the virtual window scrolled on, or
 *  the view changed — commits its draft the way a blur would, so leaving
 *  never drops an edit silently. Escape clears the draft before unmount,
 *  so cancels stay cancels; a draft that cannot parse reports itself
 *  instead of vanishing. */
function useUnmountCommit(state: {
  column: TableColumn
  /** The text a blur or Enter commit is already writing, so an unmount
   *  racing that in-flight save never writes the same draft twice. */
  committing: { current: string | undefined }
  draft: string | undefined
  onCommit: CommitCell
  row: TableRow
  value: unknown
}) {
  const latest = useRef(state)

  latest.current = state

  useEffect(
    () => () => {
      const { column, committing, draft, onCommit, row, value } = latest.current

      if (
        draft === undefined ||
        draft === committing.current ||
        draft === formatCellText(column, value)
      ) {
        return
      }

      const parsed = parseCellText(column, draft)

      if (parsed.ok) {
        void onCommit(row, column.id, parsed.value)
      } else {
        toast.error(`${column.name} kept its saved value — ${parsed.error}`)
      }
    },
    []
  )
}

/** Enter commits in place, Escape cancels, and Tab commits then moves
 *  editing along the row; a draft that does not commit keeps the editor
 *  (and any error) where it is. */
function handleEditorKey(
  event: KeyboardEvent<HTMLInputElement>,
  editor: {
    close: () => void
    commit: (text: string) => Promise<boolean>
    onAdvance: ((direction: 1 | -1) => void) | undefined
  }
) {
  const draft = event.currentTarget.value

  if (event.key === "Enter") {
    void editor.commit(draft)
  }

  if (event.key === "Escape") {
    editor.close()
  }

  if (event.key === "Tab") {
    event.preventDefault()

    const direction = event.shiftKey ? -1 : 1

    void editor.commit(draft).then((committed) => {
      if (committed) {
        editor.onAdvance?.(direction)
      }
    })
  }
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
      className="flex h-full w-full min-w-24 cursor-text items-center px-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:cursor-default disabled:hover:bg-transparent"
      disabled={disabled}
      onClick={onClick}
      title={text}
      type="button"
    >
      <span className="max-w-56 truncate">
        {text === "" ? <span className="text-muted-foreground">—</span> : text}
      </span>
    </button>
  )
}
