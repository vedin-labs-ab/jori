// Pure decisions behind drag-to-move in the sidebar folder tree: which
// rows may accept a dragged folder and what releasing over one should do.
// Free of React and dnd-kit so the rules stay unit-testable.

import { type FolderSummary, subtreeFolderIds } from "../tree"

/** Droppable id of the "Folders" group header, which moves to top level. */
export const rootDropId = "folders-root"

/** Pointer travel in pixels before a drag starts; keeps clicks clicking. */
export const dragActivationDistance = 6

/** The move a drop should request, or undefined when nothing should
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

/** The folder a dwell-to-expand timer should run against: the hovered row
 *  when it can accept the drop; null over the header, gaps, or the dragged
 *  folder's own subtree. */
export function hoverTarget(
  blockedIds: ReadonlySet<string>,
  overId: string | number | undefined
): string | null {
  if (overId === undefined || overId === rootDropId) {
    return null
  }

  const folderId = String(overId)

  return blockedIds.has(folderId) ? null : folderId
}
