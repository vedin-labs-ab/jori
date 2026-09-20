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
import { Dock, DockDivider, DockGroup } from "../../dock"
import { MenuItem, MenuLabel, MenuSeparator } from "../../menu/items"
import { type RowSelection, selectionHeadState } from "."

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
        // Shift runs from the last row ticked or picked, as it does on
        // the row itself; claiming the click keeps the box from toggling.
        onClick={(event) => {
          if (event.shiftKey) {
            event.preventDefault()
            selection.pick(row, "range")
          }
        }}
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

/** What a list's selection can be asked to do. Move and Download are
 *  only offered by the pages that pass them. */
export type SelectionActions = {
  isBusy: boolean
  noun: { plural: string; singular: string }
  onDownload?: () => void
  onMove?: () => void
  onRemove?: () => void
  removal: SelectionRemoval
}

/** The dock's actions as menu items, under a count that says the menu
 *  speaks for the whole selection rather than the row under the pointer. */
export function SelectionMenuItems({
  count,
  isBusy,
  onDownload,
  onMove,
  onRemove,
  onRemoveRequest,
  removal,
}: SelectionActions & { count: number; onRemoveRequest: () => void }) {
  const RemoveIcon = removal.isDestructive ? Trash2 : Archive

  return (
    <>
      <MenuLabel>{count} selected</MenuLabel>
      {onMove === undefined ? null : (
        <MenuItem disabled={isBusy} onSelect={onMove}>
          <FolderInput />
          Move to folder…
        </MenuItem>
      )}
      {onDownload === undefined ? null : (
        <MenuItem disabled={isBusy} onSelect={onDownload}>
          <Download />
          Download
        </MenuItem>
      )}
      {onRemove === undefined ? null : (
        <>
          <MenuSeparator />
          <MenuItem
            disabled={isBusy}
            onSelect={onRemoveRequest}
            variant={removal.isDestructive ? "destructive" : undefined}
          >
            <RemoveIcon />
            {removal.label}
          </MenuItem>
        </>
      )}
    </>
  )
}

type Confirming = { isOpen: boolean; onOpenChange: (open: boolean) => void }

/** The console's dock, for an active selection. Removing confirms first;
 *  moving hands off to the page's move dialog. */
export function SelectionActionsBar({
  confirming,
  count,
  isBusy,
  noun,
  onClear,
  onDownload,
  onMove,
  onRemove,
  removal,
}: SelectionActions & {
  /** The remove confirmation, when something besides the dock opens it. */
  confirming?: Confirming
  count: number
  onClear: () => void
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
        {/* The dock sits after the list, far from the row just picked,
            so the count is announced along with where the actions are. */}
        <span className="pr-2 font-medium text-xs tabular-nums" role="status">
          {count} selected
          <span className="sr-only">. Selection actions are available.</span>
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
            confirming={confirming}
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
  confirming,
  count,
  isBusy,
  noun,
  onRemove,
  removal,
}: {
  confirming: Confirming | undefined
  count: number
  isBusy: boolean
  noun: { plural: string; singular: string }
  onRemove: () => void
  removal: SelectionRemoval
}) {
  const own = useState(false)
  const isOpen = confirming?.isOpen ?? own[0]
  const setIsOpen = confirming?.onOpenChange ?? own[1]
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
