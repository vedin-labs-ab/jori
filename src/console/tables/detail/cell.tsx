import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type TableColumn, type TableRow } from "../types"
import { displayCellText, formatCellText, parseCellText } from "./cells"

export type CommitCell = (
  row: TableRow,
  key: string,
  value: unknown
) => Promise<boolean>

/** One grid cell: booleans toggle in place, JSON edits in a dialog, and
 *  text-like types edit inline. Every commit carries the row version. */
export function RowCell({
  column,
  disabled,
  onCommit,
  row,
}: {
  column: TableColumn
  disabled: boolean
  onCommit: CommitCell
  row: TableRow
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

  if (column.type === "json") {
    return (
      <JsonCell
        column={column}
        disabled={disabled}
        onCommit={onCommit}
        row={row}
      />
    )
  }

  return (
    <TextCell
      column={column}
      disabled={disabled}
      onCommit={onCommit}
      row={row}
    />
  )
}

function TextCell({
  column,
  disabled,
  onCommit,
  row,
}: {
  column: TableColumn
  disabled: boolean
  onCommit: CommitCell
  row: TableRow
}) {
  const [draft, setDraft] = useState<string>()
  const value = row.values[column.key]

  async function commit(text: string) {
    if (text === formatCellText(column, value)) {
      setDraft(undefined)

      return
    }

    const parsed = parseCellText(column, text)

    if (!parsed.ok) {
      toast.error(parsed.error)

      return
    }

    if (await onCommit(row, column.key, parsed.value)) {
      setDraft(undefined)
    }
  }

  if (draft === undefined) {
    return (
      <CellButton
        disabled={disabled}
        label={`Edit ${column.name}`}
        onClick={() => setDraft(formatCellText(column, value))}
        text={displayCellText(column, value)}
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
          setDraft(undefined)
        }
      }}
      value={draft}
    />
  )
}

function JsonCell({
  column,
  disabled,
  onCommit,
  row,
}: {
  column: TableColumn
  disabled: boolean
  onCommit: CommitCell
  row: TableRow
}) {
  const [isOpen, setIsOpen] = useState(false)
  const value = row.values[column.key]

  return (
    <>
      <CellButton
        disabled={disabled}
        label={`Edit ${column.name}`}
        onClick={() => setIsOpen(true)}
        text={displayCellText(column, value)}
      />
      {isOpen ? (
        <JsonCellDialog
          column={column}
          onClose={() => setIsOpen(false)}
          onCommit={onCommit}
          row={row}
        />
      ) : null}
    </>
  )
}

function JsonCellDialog({
  column,
  onClose,
  onCommit,
  row,
}: {
  column: TableColumn
  onClose: () => void
  onCommit: CommitCell
  row: TableRow
}) {
  const [text, setText] = useState(() =>
    formatCellText(column, row.values[column.key])
  )
  const parsed = parseCellText(column, text)

  return (
    <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {column.name}</DialogTitle>
          <DialogDescription>
            JSON for this cell; leave empty to clear it.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label={`${column.name} JSON`}
          className="min-h-40 font-mono text-xs"
          onChange={(event) => setText(event.target.value)}
          value={text}
        />
        {parsed.ok ? null : (
          <p className="text-destructive text-xs">{parsed.error}</p>
        )}
        <DialogFooter>
          <Button
            disabled={!parsed.ok}
            onClick={() => {
              if (parsed.ok) {
                void onCommit(row, column.key, parsed.value).then((saved) => {
                  if (saved) {
                    onClose()
                  }
                })
              }
            }}
            type="button"
          >
            Save cell
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
