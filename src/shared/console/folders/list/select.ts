import { countNoun } from "../../count"
import { type SelectionRemoval } from "../../list/selection/bar"
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
    (resource) => resource.type === "file" || resource.type === "job"
  )
  const hasChats = selection.resources.some(
    (resource) => resource.type === "chat"
  )

  if (selection.folders.length === 0 && !hasFilesOrJobs && !hasChats) {
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
    hasChats
      ? "Chats are removed from the folder and stay in your chat history."
      : null,
  ]
    .filter((part) => part !== null)
    .join(" ")

  const isDestructive = selection.folders.length > 0 || hasFilesOrJobs

  return {
    description,
    isDestructive,
    label: isDestructive ? "Delete" : "Remove",
  }
}

/** Success toast for a removed selection, naming what happened to each
 *  part of it. */
export function folderSelectionRemovalSuccess(selection: FolderSelection) {
  const archived = selection.resources.filter(archives).length
  const unfiled = selection.resources.filter(
    (resource) => resource.type === "chat"
  ).length
  const deleted =
    selection.folders.length + selection.resources.length - archived - unfiled

  if (unfiled > 0) {
    return [
      archived > 0 ? `Archived ${countNoun(archived, itemNoun)}.` : null,
      deleted > 0 ? `Deleted ${countNoun(deleted, itemNoun)}.` : null,
      `Removed ${countNoun(unfiled, { singular: "chat", plural: "chats" })} from the folder.`,
    ]
      .filter((part) => part !== null)
      .join(" ")
  }

  if (deleted === 0) {
    return `Archived ${countNoun(archived, itemNoun)}.`
  }

  if (archived === 0) {
    return `Deleted ${countNoun(deleted, itemNoun)}.`
  }

  return `Archived ${countNoun(archived, itemNoun)} and deleted ${countNoun(deleted, itemNoun)}.`
}
