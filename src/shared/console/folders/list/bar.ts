import { type RowSelection } from "../../list/selection"
import { useSelectionActions } from "../../list/selection/actions"
import { type FolderListEntry } from "./controls"
import {
  type FolderSelectionActions,
  folderSelectionRemoval,
  itemNoun,
  selectionSubject,
  splitSelection,
} from "./select"

/** A folder listing's selection as the dock and the right-click menu
 *  offer it. */
export function useFolderSelectionActions({
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

  return useSelectionActions(selection, {
    isBusy: actions.isBusy,
    noun: itemNoun,
    onMove: () => actions.onMove(selectionSubject(selected, folderId)),
    onRemove:
      folderId === undefined &&
      selected.resources.some((r) => r.type === "chat")
        ? undefined
        : () => actions.onRemove(selected),
    removal: folderSelectionRemoval(selected),
  })
}
