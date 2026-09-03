import { SelectionActionsBar } from "../../list/bar"
import { type RowSelection } from "../../list/selection"
import { type FolderListEntry } from "./controls"
import {
  type FolderSelectionActions,
  folderSelectionRemoval,
  itemNoun,
  selectionSubject,
  splitSelection,
} from "./select"

/** The console's dock over a folder listing's selection. */
export function FolderSelectionBar({
  actions,
  folderId,
  selection,
}: {
  actions: FolderSelectionActions
  /** The folder being viewed; undefined on the /folders overview. */
  folderId: string | undefined
  selection: RowSelection<FolderListEntry>
}) {
  const selected = splitSelection(selection.selected)

  return (
    <SelectionActionsBar
      count={selection.count}
      isBusy={actions.isBusy}
      noun={itemNoun}
      onClear={selection.clear}
      onMove={() => actions.onMove(selectionSubject(selected, folderId))}
      onRemove={() => actions.onRemove(selected)}
      removal={folderSelectionRemoval(selected)}
    />
  )
}
