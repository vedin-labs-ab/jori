// The drag state rows subscribe to, plus their dnd-kit wiring. The
// provider in context.tsx owns the state; each row registers itself as a
// drag source and, unless it sits in the dragged subtree, a drop target.

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { createContext, useContext, useEffect, useRef } from "react"
import { rootDropId } from "./plan"

export type FolderDragState = {
  /** The folder being dragged, or null while idle. */
  activeId: string | null
  /** Rows that must refuse the drop: the dragged folder's own subtree. */
  blockedIds: ReadonlySet<string>
  /** The folder whose move just landed, held briefly for a settle cue. */
  settledId: string | null
}

export const idleDragState: FolderDragState = {
  activeId: null,
  blockedIds: new Set<string>(),
  settledId: null,
}

export const FolderDragContext = createContext(idleDragState)

export type FolderRowDrag = ReturnType<typeof useFolderRowDrag>

/** Wires one folder row as drag source and drop target. Spread
 *  `attributes` and `listeners` onto the row's link along with the click
 *  guards, and give it `setNodeRef`. */
export function useFolderRowDrag(folderId: string) {
  const { activeId, blockedIds, settledId } = useContext(FolderDragContext)
  const draggable = useDraggable({ id: folderId })
  const droppable = useDroppable({
    id: folderId,
    disabled: activeId === null || blockedIds.has(folderId),
  })
  const wasDragged = useRef(false)

  // Raised while dragging so the click that can follow a short drag
  // released over the source row is swallowed instead of navigating.
  useEffect(() => {
    if (draggable.isDragging) {
      wasDragged.current = true
    }
  }, [draggable.isDragging])

  return {
    // dnd-kit's aria attributes, minus its button role: the row is a link.
    attributes: { ...draggable.attributes, role: undefined },
    isDragActive: activeId !== null,
    isDragSource: draggable.isDragging,
    isDropTarget: droppable.isOver,
    isSettling: settledId === folderId,
    listeners: draggable.listeners,
    onClickCapture: (event: React.MouseEvent) => {
      if (wasDragged.current) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    onPointerDownCapture: () => {
      wasDragged.current = false
    },
    setNodeRef: (node: HTMLElement | null) => {
      draggable.setNodeRef(node)
      droppable.setNodeRef(node)
    },
  }
}

/** Wires the "Folders" group header as the move-to-top-level target. */
export function useRootDrop() {
  const { activeId } = useContext(FolderDragContext)
  const droppable = useDroppable({
    id: rootDropId,
    disabled: activeId === null,
  })

  return { isDropTarget: droppable.isOver, setNodeRef: droppable.setNodeRef }
}
