// The drag state rows subscribe to, plus their dnd-kit wiring. The
// provider in provider.tsx owns the state; sidebar folder rows, folder-page
// rows, material list rows, and the group header register as sources and
// targets here.

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { createContext, useContext, useEffect, useRef } from "react"
import {
  type DragPayload,
  type DropTarget,
  type ResourceDragItem,
  resourcesPayload,
  rootDropId,
} from "./plan"

export type FolderDragState = {
  /** The payload being dragged, or null while idle. */
  active: DragPayload | null
  /** Targets that must refuse the drop, the top level as null (see
   *  blockedTargets). */
  blockedIds: ReadonlySet<string | null>
  /** The folder whose move just landed, held briefly for a settle cue. */
  settledId: string | null
}

export const idleDragState: FolderDragState = {
  active: null,
  blockedIds: new Set<string | null>(),
  settledId: null,
}

export const FolderDragContext = createContext(idleDragState)

/** Where the sidebar tree hands its dwell-to-expand handler up to the
 *  provider, which lives above both panes at the shell. */
export const ExpandHoverContext = createContext<
  (handler: (folderId: string) => void) => void
>(() => {})

/** Keeps the provider's dwell-to-expand pointed at the mounted tree. */
export function useExpandHoverHandler(handler: (folderId: string) => void) {
  const register = useContext(ExpandHoverContext)

  useEffect(() => {
    register(handler)
  })
}

/** The pane a row lives in; sidebar and folder-page rows for the same
 *  folder coexist, so the pane keys their dnd-kit ids apart. */
type DragZone = "sidebar" | "contents"

export type FolderRowDrag = ReturnType<typeof useFolderRowDrag>

/** What every drag source hands its element: dnd-kit's attributes and
 *  listeners, the click guards, and the node ref. */
export type DragSource = ReturnType<typeof useDragSource>

/** Wires one folder row as drag source and drop target. Spread
 *  `attributes` and `listeners` onto the row element along with the click
 *  guards, and give it `setNodeRef`. */
export function useFolderRowDrag(
  zone: DragZone,
  folderId: string,
  name: string
) {
  const { active, blockedIds, settledId } = useContext(FolderDragContext)
  const source = useDragSource(`${zone}-folder-${folderId}`, {
    kind: "folder",
    folderId,
    name,
  })
  const droppable = useDroppable({
    id: `${zone}-drop-${folderId}`,
    data: dropTarget(folderId, zone),
    disabled: active === null || blockedIds.has(folderId),
  })

  return {
    ...source,
    isDragActive: active !== null,
    isDropTarget: droppable.isOver,
    isSettling: settledId === folderId,
    setNodeRef: (node: HTMLElement | null) => {
      source.setNodeRef(node)
      droppable.setNodeRef(node)
    },
  }
}

/** Wires one resource row as a drag source only: resources drop onto
 *  folder rows, they take no drops themselves. Started on a selected row,
 *  the drag carries the whole selection. */
export function useResourceRowDrag(
  item: ResourceDragItem,
  selected: readonly ResourceDragItem[]
) {
  const { active } = useContext(FolderDragContext)
  const source = useDragSource(
    `resource-${item.type}-${item.id}`,
    resourcesPayload(item, selected)
  )

  return { ...source, isDragActive: active !== null }
}

/** Wires the "Folders" group header as the move-to-top-level target. */
export function useRootDrop() {
  const { active, blockedIds } = useContext(FolderDragContext)
  const droppable = useDroppable({
    id: rootDropId,
    data: dropTarget(null, "sidebar"),
    disabled: active === null || blockedIds.has(null),
  })

  return { isDropTarget: droppable.isOver, setNodeRef: droppable.setNodeRef }
}

function dropTarget(folderId: string | null, zone: DragZone): DropTarget {
  return { folderId, expands: folderId !== null && zone === "sidebar" }
}

/** One drag source with the click-vs-drag guards every draggable row
 *  needs, so a short drag released in place never navigates. */
function useDragSource(id: string, payload: DragPayload) {
  const draggable = useDraggable({ id, data: payload })
  const wasDragged = useRef(false)

  // Raised while dragging so the click that can follow a short drag
  // released over the source row is swallowed instead of navigating.
  useEffect(() => {
    if (draggable.isDragging) {
      wasDragged.current = true
    }
  }, [draggable.isDragging])

  return {
    // dnd-kit's aria attributes, minus its button role and tab stop: the
    // row's own link keeps the keyboard story, and keyboard moves go
    // through the actions menu instead.
    attributes: {
      ...draggable.attributes,
      role: undefined,
      tabIndex: undefined,
    },
    isDragSource: draggable.isDragging,
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
    setNodeRef: draggable.setNodeRef,
  }
}
