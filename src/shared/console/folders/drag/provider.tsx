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
import { Folder } from "lucide-react"
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
import { resourcePresentation } from "../types"
import { createHoverExpander } from "./hover"
import {
  blockedFolderIds,
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

/** How long a landed move keeps its settle cue on the moved row. */
const settleDuration = 450

// Pointer drags skip the keyboard sensor: the rows are links whose Enter
// must navigate, so keyboard moves go through the actions menus instead.
const screenReaderInstructions = {
  draggable:
    "Rows move with a pointer drag. To move a folder or a filed resource with the keyboard, open the row's actions menu and choose Move to.",
}

/** What a released drag asks of its host: the move or re-filing that the
 *  payload and target name. Resolves once the request has run — or been
 *  declined — to whether the payload landed, so a moved folder's row can
 *  show its settle cue. */
export type FolderDrop = (
  payload: DragPayload,
  target: DropTarget
) => Promise<boolean>

/** Runs drag-to-move and drag-to-file across the console: the sidebar
 *  tree and the folder page's rows register through state.ts, a ghost
 *  follows the pointer, dwelling on a sidebar row asks the tree to open
 *  it, and a drop is handed to the host. Mounted at the shell so one
 *  context spans both panes. */
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

  return (
    <FolderDragContext.Provider value={drag.state}>
      <ExpandHoverContext.Provider value={drag.registerExpandHover}>
        <DndContext
          accessibility={{ screenReaderInstructions }}
          collisionDetection={pointerWithin}
          sensors={sensors}
          {...drag.handlers}
        >
          {children}
          {drag.state.active === null ? null : (
            <DragGhost payload={drag.state.active} />
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
          : blockedFolderIds(folders, active),
      settledId: settle.settledId,
    }),
    [active, folders, settle.settledId]
  )
  const finish = () => {
    expander.expander.reset()
    setActive(null)
  }
  const drop = (payload: DragPayload, target: DropTarget) =>
    onDrop(payload, target).then((landed) => {
      if (landed && payload.kind === "folder") {
        settle.show(payload.folderId)
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
 *  the body so neither pane's overflow can clip it. */
function DragGhost({ payload }: { payload: DragPayload }) {
  const Icon =
    payload.kind === "folder" ? Folder : resourcePresentation(payload).icon

  return createPortal(
    <DragOverlay dropAnimation={null}>
      <div className="flex h-8 w-fit max-w-52 items-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-2 text-sidebar-foreground text-xs shadow-md motion-safe:scale-105">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{payload.name}</span>
      </div>
    </DragOverlay>,
    document.body
  )
}
