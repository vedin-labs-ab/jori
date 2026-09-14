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
import { TableCell, TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Dock, DockDivider, DockGroup } from "../dock"
import { type RowSelection, selectionHeadState } from "./selection"

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
        checked={selectionHeadState(selection)}
        onCheckedChange={selection.toggleAll}
      />
    </TableHead>
  )
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

/** The console's dock, for an active selection. Removing confirms first;
 *  moving hands off to the page's move dialog. Move and Download only
 *  render for pages that pass them. */
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
  onRemove?: () => void
  removal: SelectionRemoval
}) {
  if (count === 0) {
    return null
  }

  return (
    <Dock label="Selection actions">
      {/* The way out leads, beside the count it clears: the two are one
          group, so a stacked bar keeps them on a row of their own. */}
      <DockGroup>
        <Button
          aria-label="Clear selection"
          onClick={onClear}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
        <span className="pr-2 font-medium text-xs tabular-nums">
          {count} selected
        </span>
      </DockGroup>
      <DockDivider />
      <DockGroup>
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
        {onRemove === undefined ? null : (
          <SelectionRemoveButton
            count={count}
            isBusy={isBusy}
            noun={noun}
            onRemove={onRemove}
            removal={removal}
          />
        )}
      </DockGroup>
    </Dock>
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
