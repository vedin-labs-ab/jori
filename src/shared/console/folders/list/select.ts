import { countNoun } from "../../count"
import { type SelectionRemoval } from "../../list/bar"
import {
  type FolderResource,
  type ListedFolder,
  type MoveSubject,
  moveTarget,
  toFiledType,
} from "../types"
import { type FolderListEntry, isFolderEntry } from "./controls"

// A folder listing's selection acts on both of its row groups at once:
// a move re-parents the folders and re-files the resources in one dialog,
// a removal takes each row the way its own menu would.

export const itemNoun = { plural: "items", singular: "item" }

/** The selected rows, by group. */
export type FolderSelection = {
  folders: ListedFolder[]
  resources: FolderResource[]
}

/** What the listing's selection bar asks of the host. */
export type FolderSelectionActions = {
  isBusy: boolean
  onMove: (subject: MoveSubject) => void
  onRemove: (selection: FolderSelection) => void
}

export function splitSelection(selected: FolderListEntry[]): FolderSelection {
  return {
    folders: selected.filter(isFolderEntry),
    resources: selected.filter(
      (entry): entry is FolderResource => !isFolderEntry(entry)
    ),
  }
}

/** The selection as the move dialog's subject; `folderId` is the folder
 *  being viewed, where the selected resources already sit. */
export function selectionSubject(
  selection: FolderSelection,
  folderId: string | undefined
): MoveSubject {
  return {
    folders: selection.folders.map(({ folderId: id, name, parentId }) => ({
      folderId: id,
      name,
      parentId,
    })),
    resources: selection.resources.map((resource) =>
      moveTarget(toFiledType(resource.type), resource.id, {
        name: resource.name,
        folderId,
      })
    ),
  }
}

function archives(resource: FolderResource) {
  return resource.type === "table" || resource.type === "store"
}

/** How removing the selection presents: tables and stores archive first,
 *  as their menus do; folders, files, and jobs go for good, so any of
 *  those makes the step a delete. */
export function folderSelectionRemoval(
  selection: FolderSelection
): SelectionRemoval {
  const hasArchiving = selection.resources.some(archives)
  const hasFilesOrJobs = selection.resources.some(
    (resource) => !archives(resource)
  )

  if (selection.folders.length === 0 && !hasFilesOrJobs) {
    return {
      description:
        "This removes the tables and stores from the active list and blocks writes until they are restored.",
      isDestructive: false,
      label: "Archive",
    }
  }

  const description = [
    selection.folders.length > 0
      ? "Folders are deleted with their subfolders; what is filed inside moves up a level."
      : null,
    hasFilesOrJobs ? "Files and jobs are permanently deleted." : null,
    hasArchiving ? "Tables and stores are archived instead." : null,
  ]
    .filter((part) => part !== null)
    .join(" ")

  return { description, isDestructive: true, label: "Delete" }
}

/** Success toast for a removed selection, naming what happened to each
 *  part of it. */
export function folderSelectionRemovalSuccess(selection: FolderSelection) {
  const archived = selection.resources.filter(archives).length
  const deleted =
    selection.folders.length + selection.resources.length - archived

  if (deleted === 0) {
    return `Archived ${countNoun(archived, itemNoun)}.`
  }

  if (archived === 0) {
    return `Deleted ${countNoun(deleted, itemNoun)}.`
  }

  return `Archived ${countNoun(archived, itemNoun)} and deleted ${countNoun(deleted, itemNoun)}.`
}
