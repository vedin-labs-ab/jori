// Pure decisions behind drag-to-move and drag-to-file across the sidebar
// tree and the folder page: what a drag carries, which rows may take it,
// and what releasing over one should request. Free of React and dnd-kit
// so the rules stay unit-testable.

import { type FolderSummary, subtreeFolderIds } from "../tree"

/** Droppable id of the "Folders" group header, which targets top level. */
export const rootDropId = "folders-root"

/** Pointer travel in pixels before a drag starts; keeps clicks clicking. */
export const dragActivationDistance = 6

/** What a drag carries: a folder re-parents, a filed resource re-files. */
export type DragPayload = FolderDragPayload | ResourceDragPayload

export type FolderDragPayload = {
  kind: "folder"
  folderId: string
  name: string
}

export type ResourceDragPayload = {
  kind: "resource"
  type: "table" | "store" | "file" | "automation"
  id: string
  name: string
  mimeType?: string
  /** The folder the resource currently sits in. */
  folderId: string
}

/** What every drop target names: folder rows name their folder, the group
 *  header names the top level. Only sidebar rows expand on dwell — the
 *  folder page cannot unfold a row in place. */
export type DropTarget = {
  folderId: string | null
  expands: boolean
}

/** Folder rows that must refuse the drag: a dragged folder's own subtree
 *  (dropping there would create a cycle), or the one folder a dragged
 *  resource already sits in (leaving it there is a silent no-op). */
export function blockedFolderIds(
  folders: readonly FolderSummary[],
  payload: DragPayload
): ReadonlySet<string> {
  return payload.kind === "folder"
    ? subtreeFolderIds(folders, payload.folderId)
    : new Set([payload.folderId])
}

/** The move a folder drop should request, or undefined when nothing should
 *  happen: the target sits in the dragged folder's own subtree (a cycle),
 *  or the folder already lives there (a silent no-op). */
export function planDrop(
  folders: readonly FolderSummary[],
  draggedId: string,
  targetId: string | null
): { parentId: string | null } | undefined {
  const dragged = folders.find((row) => row.folderId === draggedId)

  if (dragged === undefined) {
    return undefined
  }

  if (targetId !== null && subtreeFolderIds(folders, draggedId).has(targetId)) {
    return undefined
  }

  if ((dragged.parentId ?? null) === targetId) {
    return undefined
  }

  return { parentId: targetId }
}

/** The re-filing a resource drop should request, or undefined for the
 *  silent no-op of dropping a resource where it already sits. A null
 *  target unfiles it back to the flat lists. */
export function planFileDrop(
  payload: ResourceDragPayload,
  targetFolderId: string | null
): { folderId: string | null } | undefined {
  return payload.folderId === targetFolderId
    ? undefined
    : { folderId: targetFolderId }
}

/** The folder a dwell-to-expand timer should run against: the hovered
 *  sidebar row when it can accept the drop; null over the header, gaps,
 *  folder-page rows, and rows the drag is blocked from. */
export function hoverTarget(
  blockedIds: ReadonlySet<string>,
  target: DropTarget | undefined
): string | null {
  if (target === undefined || target.folderId === null || !target.expands) {
    return null
  }

  return blockedIds.has(target.folderId) ? null : target.folderId
}
