// Pure decisions behind drag-to-move and drag-to-file across the sidebar
// tree, the folder pages, and the material lists: what a drag carries,
// which rows may take it, and what releasing over one should request.
// Free of React and dnd-kit so the rules stay unit-testable.

import { type FolderSummary, subtreeFolderIds } from "../tree"

/** Droppable id of the "Folders" group header, which targets top level. */
export const rootDropId = "folders-root"

/** Pointer travel in pixels before a drag starts; keeps clicks clicking. */
export const dragActivationDistance = 6

/** What a drag carries: a folder re-parents, resources re-file. A resource
 *  drag carries one row, or every selected row when the row picked up was
 *  part of the selection; folders always travel alone. */
export type DragPayload = FolderDragPayload | ResourcesDragPayload

export type FolderDragPayload = {
  kind: "folder"
  folderId: string
  name: string
}

export type ResourcesDragPayload = {
  kind: "resources"
  items: ResourceDragItem[]
}

export type ResourceDragItem = {
  type: "table" | "store" | "file" | "job"
  id: string
  name: string
  mimeType?: string
  /** The folder the resource currently sits in; absent when unfiled. */
  folderId?: string
}

/** The resources a drag started on `item` carries: the whole selection
 *  when the item is part of it, else the item alone. */
export function resourcesPayload(
  item: ResourceDragItem,
  selected: readonly ResourceDragItem[]
): ResourcesDragPayload {
  const isSelected = selected.some(
    (candidate) => candidate.type === item.type && candidate.id === item.id
  )

  return { kind: "resources", items: isSelected ? [...selected] : [item] }
}

/** What every drop target names: folder rows name their folder, the group
 *  header names the top level. Only sidebar rows expand on dwell — the
 *  folder page cannot unfold a row in place. */
export type DropTarget = {
  folderId: string | null
  expands: boolean
}

/** Targets that must refuse the drag, the top level as null: a dragged
 *  folder's own subtree (dropping there would create a cycle) and the
 *  place it already sits; for resources, the one home they all share —
 *  leaving anything where it is would be a silent no-op. */
export function blockedTargets(
  folders: readonly FolderSummary[],
  payload: DragPayload
): ReadonlySet<string | null> {
  if (payload.kind === "folder") {
    const dragged = folders.find((row) => row.folderId === payload.folderId)

    return new Set<string | null>([
      ...subtreeFolderIds(folders, payload.folderId),
      dragged?.parentId ?? null,
    ])
  }

  const home = sharedHome(payload.items)

  return home === undefined ? new Set() : new Set([home])
}

/** The one folder every item sits in (null when all are unfiled), or
 *  undefined when they come from different places. */
function sharedHome(items: readonly ResourceDragItem[]) {
  const homes = new Set(items.map((item) => item.folderId ?? null))

  return homes.size === 1 ? [...homes][0] : undefined
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

/** The re-filing a resource drop should request: the items that do not
 *  already sit in the target, or undefined when none would move. A null
 *  target unfiles them back to the flat lists. */
export function planFileDrop(
  payload: ResourcesDragPayload,
  targetFolderId: string | null
): { folderId: string | null; items: ResourceDragItem[] } | undefined {
  const items = payload.items.filter(
    (item) => (item.folderId ?? null) !== targetFolderId
  )

  return items.length === 0 ? undefined : { folderId: targetFolderId, items }
}

/** The folder a dwell-to-expand timer should run against: the hovered
 *  sidebar row when it can accept the drop; null over the header, gaps,
 *  folder-page rows, and rows the drag is blocked from. */
export function hoverTarget(
  blockedIds: ReadonlySet<string | null>,
  target: DropTarget | undefined
): string | null {
  if (target === undefined || target.folderId === null || !target.expands) {
    return null
  }

  return blockedIds.has(target.folderId) ? null : target.folderId
}
