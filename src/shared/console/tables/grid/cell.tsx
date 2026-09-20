import { type Ref, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { displayCellText, formatCellText, parseCellText } from "../cells"
import { type TableColumn, type TableRow } from "../types"
import { CellInput } from "./input"

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
      value={value}
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
  value,
}: {
  column: TableColumn
  disabled: boolean
  onAdvance: ((direction: 1 | -1) => void) | undefined
  onCommit: CommitCell
  onSettle: (() => void) | undefined
  row: TableRow
  spotlight: boolean
  value: unknown
}) {
  const [draft, setDraft] = useCellDraft(column, value, spotlight, disabled)
  const [error, setError] = useState<string>()
  const button = useRef<HTMLButtonElement>(null)

  const committing = useRef<string>(undefined)

  useUnmountCommit({ column, committing, draft, onCommit, row, value })

  function close() {
    setError(undefined)
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
      setError(parsed.error)

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
        buttonRef={button}
        disabled={disabled}
        label={`Edit ${column.name}`}
        onClick={() => setDraft(formatCellText(column, value))}
        text={displayCellText(value)}
      />
    )
  }

  return (
    <CellInput
      label={`${column.name} value`}
      message={error}
      onAdvance={onAdvance}
      onChange={(text) => {
        setError(undefined)
        setDraft(text)
      }}
      onClose={close}
      onRestoreFocus={() => button.current?.focus({ preventScroll: true })}
      onCommit={commit}
      value={draft}
    />
  )
}

/** The row menu can spotlight an already mounted cell as well as a new row. */
function useCellDraft(
  column: TableColumn,
  value: unknown,
  spotlight: boolean,
  disabled: boolean
) {
  const state = useState<string | undefined>(() =>
    spotlight && !disabled ? formatCellText(column, value) : undefined
  )
  const [, setDraft] = state

  useEffect(() => {
    if (spotlight && !disabled) {
      setDraft((current) => current ?? formatCellText(column, value))
    }
  }, [column, disabled, spotlight, value])

  return state
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

function CellButton({
  buttonRef,
  disabled,
  label,
  onClick,
  text,
}: {
  buttonRef: Ref<HTMLButtonElement>
  disabled: boolean
  label: string
  onClick: () => void
  text: string
}) {
  return (
    // Named by its value, then what pressing it does. A label alone made
    // every cell in a column announce the same words and no data.
    <button
      ref={buttonRef}
      className="flex h-full w-full min-w-24 cursor-text items-center px-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-default disabled:hover:bg-transparent"
      disabled={disabled}
      onClick={onClick}
      title={text}
      type="button"
    >
      <span className="max-w-56 truncate">
        {text === "" ? (
          <span aria-hidden className="text-muted-foreground">
            —
          </span>
        ) : (
          text
        )}
      </span>
      <span className="sr-only">
        {text === "" ? "Empty" : ""}, {label}
      </span>
    </button>
  )
}
