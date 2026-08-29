import {
  Archive,
  Download,
  FolderInput,
  Loader2,
  Trash2,
  X,
} from "lucide-react"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { TableCell, TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { type RowSelection } from "./selection"

/** Header checkbox: none, partial (a partly selected page shows the
 *  indeterminate minus), or all. Toggling from partial selects the rest. */
export function SelectionHeadCell<Row>({
  selection,
}: {
  selection: RowSelection<Row>
}) {
  return (
    <TableHead className="w-8">
      <Checkbox
        aria-label="Select all rows"
        checked={headerState(selection)}
        onCheckedChange={selection.toggleAll}
      />
    </TableHead>
  )
}

function headerState<Row>(selection: RowSelection<Row>) {
  if (selection.allSelected) {
    return true
  }

  return selection.count > 0 ? ("indeterminate" as const) : false
}

export function SelectionRowCell<Row>({
  label,
  row,
  selection,
}: {
  label: string
  row: Row
  selection: RowSelection<Row>
}) {
  return (
    <TableCell className="w-8">
      <Checkbox
        aria-label={label}
        checked={selection.isSelected(row)}
        onCheckedChange={() => selection.toggle(row)}
      />
    </TableCell>
  )
}

/** How the bar's destructive action presents: materials archive before
 *  they delete, files delete outright, so the host names the step. */
export type SelectionRemoval = {
  description: string
  isDestructive: boolean
  label: string
}

/** Floating action bar for an active selection, anchored to the bottom of
 *  a ConsoleListLayout. Removing confirms first; moving hands off to the
 *  page's move dialog. Move and Download only render for pages that pass
 *  them. */
export function SelectionActionsBar({
  count,
  isBusy,
  noun,
  onClear,
  onDownload,
  onMove,
  onRemove,
  removal,
}: {
  count: number
  isBusy: boolean
  noun: { plural: string; singular: string }
  onClear: () => void
  onDownload?: () => void
  onMove?: () => void
  onRemove: () => void
  removal: SelectionRemoval
}) {
  if (count === 0) {
    return null
  }

  return (
    <div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-20 fade-in-0 slide-in-from-bottom-2 animate-in duration-200">
      <div
        aria-label="Selection actions"
        className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-md"
        role="toolbar"
      >
        <span className="px-2 font-medium text-xs tabular-nums">
          {count} selected
        </span>
        <Separator
          className="data-vertical:h-4 data-vertical:self-auto"
          orientation="vertical"
        />
        {onMove === undefined ? null : (
          <Button
            disabled={isBusy}
            onClick={onMove}
            type="button"
            variant="ghost"
          >
            <FolderInput />
            Move
          </Button>
        )}
        {onDownload === undefined ? null : (
          <Button
            disabled={isBusy}
            onClick={onDownload}
            type="button"
            variant="ghost"
          >
            {isBusy ? <Loader2 className="animate-spin" /> : <Download />}
            Download
          </Button>
        )}
        <SelectionRemoveButton
          count={count}
          isBusy={isBusy}
          noun={noun}
          onRemove={onRemove}
          removal={removal}
        />
        <Separator
          className="data-vertical:h-4 data-vertical:self-auto"
          orientation="vertical"
        />
        <Button
          aria-label="Clear selection"
          onClick={onClear}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>
    </div>
  )
}

function SelectionRemoveButton({
  count,
  isBusy,
  noun,
  onRemove,
  removal,
}: {
  count: number
  isBusy: boolean
  noun: { plural: string; singular: string }
  onRemove: () => void
  removal: SelectionRemoval
}) {
  const [isOpen, setIsOpen] = useState(false)
  const subject =
    count === 1 ? `this ${noun.singular}` : `${count} ${noun.plural}`
  const RemoveIcon = removal.isDestructive ? Trash2 : Archive

  return (
    <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
      <Button
        className={cn(
          removal.isDestructive && "text-destructive hover:text-destructive"
        )}
        disabled={isBusy}
        onClick={() => setIsOpen(true)}
        type="button"
        variant="ghost"
      >
        <RemoveIcon
          className={removal.isDestructive ? "text-destructive" : undefined}
        />
        {removal.label}
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {removal.label} {subject}?
          </AlertDialogTitle>
          <AlertDialogDescription>{removal.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onRemove}
            variant={removal.isDestructive ? "destructive" : "default"}
          >
            {removal.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
