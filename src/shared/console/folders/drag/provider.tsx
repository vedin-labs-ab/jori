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
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { type FolderSummary } from "../tree"
import { useDraggingBody } from "./body"
import { snapCenterToCursor } from "./center"
import { DragGhost } from "./ghost"
import { createHoverExpander } from "./hover"
import {
  blockedTargets,
  type DragPayload,
  type DropTarget,
  dragActivationDistance,
  hoverTarget,
} from "./plan"
import {
  ExpandHoverContext,
  FolderDragContext,
  type FolderDragState,
  idleDragState,
} from "./state"

/** How long a landed move keeps its settle cue on the moved rows. */
const settleDuration = 450

// Pointer drags skip the keyboard sensor: the rows are links whose Enter
// must navigate, so keyboard moves go through the actions menus instead.
const screenReaderInstructions = {
  draggable:
    "Rows move with a pointer drag. To move a folder or a resource with the keyboard, open the row's actions menu and choose Move to folder.",
}

/** What a released drag asks of its host: the move that the payload and
 *  target name. Resolves once the request has run — or been declined —
 *  to whether the payload landed, so a moved folder's row can show its
 *  settle cue. */
export type FolderDrop = (
  payload: DragPayload,
  target: DropTarget
) => Promise<boolean>

/** The overlay's wrapper, pinned to the viewport's origin and shrunk to
 *  the front card, so the centering modifier can place it from the
 *  pointer's own coordinates alone. */
const overlayStyle = {
  left: 0,
  top: 0,
  width: "fit-content",
  height: "fit-content",
}

/** Runs drag-to-move and drag-to-file across the console: the sidebar
 *  tree, the folder pages, and the material lists register through
 *  state.ts, a ghost rides the pointer, dwelling on a sidebar row asks the
 *  tree to open it, and a drop is handed to the host. Mounted at the shell
 *  so one context spans both panes. */
export function FolderDragProvider({
  children,
  folders,
  onDrop,
}: {
  children: ReactNode
  /** The organization's folder tree, for drop planning and blocked rows. */
  folders: readonly FolderSummary[]
  onDrop: FolderDrop
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: dragActivationDistance },
    })
  )
  const drag = useContentDrag(folders, onDrop)

  useDraggingBody(drag.state.active !== null)

  return (
    <FolderDragContext.Provider value={drag.state}>
      <ExpandHoverContext.Provider value={drag.registerExpandHover}>
        <DndContext
          accessibility={{ screenReaderInstructions }}
          collisionDetection={pointerWithin}
          // dnd-kit numbers its contexts from a module counter, which a
          // server and its client count differently; a fixed id keeps
          // the rows' aria-describedby the same on both.
          id="folders"
          sensors={sensors}
          {...drag.handlers}
        >
          {children}
          {drag.state.active === null
            ? null
            : createPortal(
                // Portaled to the body so neither pane's overflow can clip
                // it, centered under the cursor, and never in the way of
                // the pointer's own hit-testing.
                <DragOverlay
                  className="pointer-events-none"
                  dropAnimation={null}
                  modifiers={[snapCenterToCursor]}
                  style={overlayStyle}
                >
                  <DragGhost payload={drag.state.active} />
                </DragOverlay>,
                document.body
              )}
        </DndContext>
      </ExpandHoverContext.Provider>
    </FolderDragContext.Provider>
  )
}

function useContentDrag(folders: readonly FolderSummary[], onDrop: FolderDrop) {
  const [active, setActive] = useState<DragPayload | null>(null)
  const settle = useSettle()
  const expander = useExpander()
  const state = useMemo<FolderDragState>(
    () => ({
      active,
      blockedIds:
        active === null
          ? idleDragState.blockedIds
          : blockedTargets(folders, active),
      settledIds: settle.settledIds,
    }),
    [active, folders, settle.settledIds]
  )
  const finish = () => {
    expander.expander.reset()
    setActive(null)
  }
  const drop = (payload: DragPayload, target: DropTarget) =>
    onDrop(payload, target).then((landed) => {
      if (landed && payload.folders.length > 0) {
        settle.show(payload.folders.map((folder) => folder.folderId))
      }
    })

  return {
    handlers: {
      onDragCancel: finish,
      onDragEnd: (event: DragEndEvent) => {
        const payload = event.active.data.current as DragPayload | undefined
        const target = overTarget(event.over)

        finish()

        if (payload !== undefined && target !== undefined) {
          void drop(payload, target)
        }
      },
      onDragOver: (event: DragOverEvent) =>
        expander.expander.hover(
          hoverTarget(state.blockedIds, overTarget(event.over))
        ),
      onDragStart: (event: DragStartEvent) =>
        setActive(
          (event.active.data.current as DragPayload | undefined) ?? null
        ),
    },
    registerExpandHover: expander.registerExpandHover,
    state,
  }
}

function overTarget(over: DragEndEvent["over"]): DropTarget | undefined {
  return over?.data.current as DropTarget | undefined
}

/** Dwell-to-expand against whichever sidebar tree is mounted: the tree
 *  registers its handler through ExpandHoverContext, and the expander
 *  always calls the latest one. */
function useExpander() {
  const handler = useRef<(folderId: string) => void>(() => {})
  const expander = useMemo(
    () => createHoverExpander((folderId) => handler.current(folderId)),
    []
  )
  const registerExpandHover = useCallback(
    (callback: (folderId: string) => void) => {
      handler.current = callback
    },
    []
  )

  useEffect(() => () => expander.reset(), [expander])

  return { expander, registerExpandHover }
}

function useSettle() {
  const [settledIds, setSettledIds] = useState<ReadonlySet<string>>(
    idleDragState.settledIds
  )
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  return {
    settledIds,
    show: (folderIds: string[]) => {
      clearTimeout(timer.current)
      setSettledIds(new Set(folderIds))
      timer.current = setTimeout(
        () => setSettledIds(idleDragState.settledIds),
        settleDuration
      )
    },
  }
}
