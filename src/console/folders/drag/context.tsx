import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { Folder } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import { type FolderSummary, subtreeFolderIds } from "../tree"
import { createHoverExpander } from "./hover"
import {
  dragActivationDistance,
  hoverTarget,
  planDrop,
  rootDropId,
} from "./plan"
import { FolderDragContext, type FolderDragState, idleDragState } from "./state"

/** How long a landed move keeps its settle cue on the moved row. */
const settleDuration = 450

// Pointer drags skip the keyboard sensor: the rows are links whose Enter
// must navigate, so keyboard moves go through the actions menu instead.
const screenReaderInstructions = {
  draggable:
    "Folder rows move with a pointer drag. To move a folder with the keyboard, open the folder's actions menu and choose Move to.",
}

/** Runs drag-to-move for the sidebar folder tree: rows inside register
 *  through state.ts, a ghost follows the pointer, dwelling on a row asks
 *  `onExpandHover` to open it, and a drop requests the backend move. */
export function FolderDragProvider({
  children,
  folders,
  onExpandHover,
  organizationId,
}: {
  children: React.ReactNode
  folders: readonly FolderSummary[]
  onExpandHover: (folderId: string) => void
  organizationId: string
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: dragActivationDistance },
    })
  )
  const drag = useFolderDrag(folders, onExpandHover, organizationId)

  return (
    <FolderDragContext.Provider value={drag.state}>
      <DndContext
        accessibility={{ screenReaderInstructions }}
        collisionDetection={pointerWithin}
        sensors={sensors}
        {...drag.handlers}
      >
        {children}
        {drag.state.activeId === null ? null : (
          <DragGhost name={drag.activeName} />
        )}
      </DndContext>
    </FolderDragContext.Provider>
  )
}

function useFolderDrag(
  folders: readonly FolderSummary[],
  onExpandHover: (folderId: string) => void,
  organizationId: string
) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const settle = useSettle()
  const drop = useDropMove(organizationId, folders, settle.show)
  const expander = useExpander(onExpandHover)
  const state = useMemo<FolderDragState>(
    () => ({
      activeId,
      blockedIds:
        activeId === null
          ? idleDragState.blockedIds
          : subtreeFolderIds(folders, activeId),
      settledId: settle.settledId,
    }),
    [activeId, folders, settle.settledId]
  )
  const finish = () => {
    expander.reset()
    setActiveId(null)
  }

  return {
    activeName: folders.find((row) => row.folderId === activeId)?.name,
    handlers: {
      onDragCancel: finish,
      onDragEnd: (event: DragEndEvent) => {
        finish()
        void drop(String(event.active.id), event.over?.id)
      },
      onDragOver: (event: DragOverEvent) =>
        expander.hover(hoverTarget(state.blockedIds, event.over?.id)),
      onDragStart: (event: DragStartEvent) =>
        setActiveId(String(event.active.id)),
    },
    state,
  }
}

/** Sends the planned move and reports failure the way the dialog does;
 *  invalid targets and same-parent drops resolve to no plan and no call. */
function useDropMove(
  organizationId: string,
  folders: readonly FolderSummary[],
  onMoved: (folderId: string) => void
) {
  const move = useMutation(api.folders.console.move)

  return async (draggedId: string, overId: string | number | undefined) => {
    if (overId === undefined) {
      return
    }

    const over = String(overId)
    const plan = planDrop(folders, draggedId, over === rootDropId ? null : over)

    if (plan === undefined) {
      return
    }

    const name = folders.find((row) => row.folderId === draggedId)?.name

    try {
      await move({
        organizationId,
        folderId: draggedId as GenericId<"folders">,
        parentId: plan.parentId as GenericId<"folders"> | null,
      })
      onMoved(draggedId)
    } catch (error) {
      showErrorToast(error, `Could not move ${name ?? "the folder"}.`)
    }
  }
}

function useExpander(onExpandHover: (folderId: string) => void) {
  const callback = useRef(onExpandHover)
  const expander = useMemo(
    () => createHoverExpander((folderId) => callback.current(folderId)),
    []
  )

  useEffect(() => {
    callback.current = onExpandHover
  })

  useEffect(() => () => expander.reset(), [expander])

  return expander
}

function useSettle() {
  const [settledId, setSettledId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  return {
    settledId,
    show: (folderId: string) => {
      clearTimeout(timer.current)
      setSettledId(folderId)
      timer.current = setTimeout(() => setSettledId(null), settleDuration)
    },
  }
}

/** The pointer-tracking ghost: a compact chip with the row's idiom, lifted
 *  by a shadow and, when motion is welcome, a slight scale-up. Portaled to
 *  the body so the sidebar's overflow cannot clip it. */
function DragGhost({ name }: { name: string | undefined }) {
  return createPortal(
    <DragOverlay dropAnimation={null}>
      {name === undefined ? null : (
        <div className="flex h-8 w-fit max-w-52 items-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-2 text-sidebar-foreground text-xs shadow-md motion-safe:scale-105">
          <Folder className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{name}</span>
        </div>
      )}
    </DragOverlay>,
    document.body
  )
}
