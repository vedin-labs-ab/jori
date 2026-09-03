// Pure decisions behind drag-to-move and drag-to-file across the sidebar
// tree, the folder pages, and the material lists: what a drag carries,
// which rows may take it, and what releasing over one should request.
// Free of React and dnd-kit so the rules stay unit-testable.

import { type FolderSummary, subtreeFolderIds } from "../tree"

/** Droppable id of the "Folders" group header, which targets top level. */
export const rootDropId = "folders-root"

/** Pointer travel in pixels before a drag starts; keeps clicks clicking. */
export const dragActivationDistance = 6

/** What a drag carries: folders that re-parent and resources that re-file
 *  — one row, or every selected row when the row picked up was part of
 *  the selection, folders and resources together. */
export type DragPayload = {
  folders: FolderDragItem[]
  resources: ResourceDragItem[]
}

export type FolderDragItem = {
  folderId: string
  name: string
}

export type ResourceDragItem = {
  type: "table" | "store" | "file" | "job"
  id: string
  name: string
  mimeType?: string
  /** The folder the resource currently sits in; absent when unfiled. */
  folderId?: string
}

export const emptyPayload: DragPayload = { folders: [], resources: [] }

export function folderPayload(folder: FolderDragItem): DragPayload {
  return { folders: [folder], resources: [] }
}

export function resourcePayload(resource: ResourceDragItem): DragPayload {
  return { folders: [], resources: [resource] }
}

/** How many rows a drag carries. */
export function payloadSize(payload: DragPayload) {
  return payload.folders.length + payload.resources.length
}

/** What a drag started on one row carries: the whole selection when the
 *  row is part of it — with that row brought to the front — else the row
 *  alone. */
export function carriedPayload(
  grabbed: DragPayload,
  selected: DragPayload
): DragPayload {
  const [folder] = grabbed.folders
  const [resource] = grabbed.resources

  if (folder !== undefined && selected.folders.some(sameFolder(folder))) {
    return {
      folders: [
        folder,
        ...selected.folders.filter((other) => !sameFolder(folder)(other)),
      ],
      resources: selected.resources,
    }
  }

  if (
    resource !== undefined &&
    selected.resources.some(sameResource(resource))
  ) {
    return {
      folders: selected.folders,
      resources: [
        resource,
        ...selected.resources.filter((other) => !sameResource(resource)(other)),
      ],
    }
  }

  return grabbed
}

function sameFolder(folder: FolderDragItem) {
  return (other: FolderDragItem) => other.folderId === folder.folderId
}

function sameResource(resource: ResourceDragItem) {
  return (other: ResourceDragItem) =>
    other.type === resource.type && other.id === resource.id
}

/** What every drop target names: folder rows name their folder, the group
 *  header names the top level. Only sidebar rows expand on dwell — the
 *  folder page cannot unfold a row in place. */
export type DropTarget = {
  folderId: string | null
  expands: boolean
}

/** Targets that must refuse the drag, the top level as null: every
 *  dragged folder's own subtree (dropping there would create a cycle) and
 *  the place it already sits, plus the one home the dragged resources all
 *  share — leaving anything where it is would be a silent no-op. */
export function blockedTargets(
  folders: readonly FolderSummary[],
  payload: DragPayload
): ReadonlySet<string | null> {
  const blocked = new Set<string | null>()

  for (const dragged of payload.folders) {
    for (const folderId of subtreeFolderIds(folders, dragged.folderId)) {
      blocked.add(folderId)
    }

    blocked.add(parentOf(folders, dragged.folderId))
  }

  const home = sharedHome(payload.resources)

  if (home !== undefined) {
    blocked.add(home)
  }

  return blocked
}

function parentOf(folders: readonly FolderSummary[], folderId: string) {
  return folders.find((row) => row.folderId === folderId)?.parentId ?? null
}

/** The one folder every resource sits in (null when all are unfiled), or
 *  undefined when there are none or they come from different places. */
function sharedHome(resources: readonly ResourceDragItem[]) {
  const homes = new Set(resources.map((item) => item.folderId ?? null))

  return homes.size === 1 ? [...homes][0] : undefined
}

/** The move a drop should request: the folders that can re-parent into
 *  the target (not into their own subtree, not where they already are)
 *  and the resources that do not already sit there, or undefined when
 *  nothing would move. A null target is the top level. */
export function planDrop(
  folders: readonly FolderSummary[],
  payload: DragPayload,
  targetId: string | null
): DragPlan | undefined {
  const moving = payload.folders.filter(
    (dragged) =>
      folders.some((row) => row.folderId === dragged.folderId) &&
      parentOf(folders, dragged.folderId) !== targetId &&
      (targetId === null ||
        !subtreeFolderIds(folders, dragged.folderId).has(targetId))
  )
  const filing = payload.resources.filter(
    (item) => (item.folderId ?? null) !== targetId
  )

  return moving.length === 0 && filing.length === 0
    ? undefined
    : { folderId: targetId, folders: moving, resources: filing }
}

export type DragPlan = DragPayload & {
  /** Where everything lands: a folder, or null for the top level. */
  folderId: string | null
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
