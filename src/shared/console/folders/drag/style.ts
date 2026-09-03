import { cn } from "@/lib/utils"
import { type DragSource } from "./state"

/** What a row hands its element to take part in a drag: the source
 *  wiring, and the states the row's styling reads. */
export type RowDrag = DragSource & {
  isDragActive: boolean
  isDropTarget?: boolean
  isSettling?: boolean
}

/** Drag styling for a listing row, mirroring the sidebar's: the row
 *  offers the open hand — its links and buttons keep their own cursors —
 *  the source dims, the hovered valid target takes the accent, plain
 *  hover goes quiet while a drag runs, and a landed move fades the row in
 *  where it settled — unless the user prefers reduced motion. */
export function rowDragClasses(drag: {
  isDragActive: boolean
  isDragSource: boolean
  isDropTarget?: boolean
  isSettling?: boolean
}) {
  return cn(
    "cursor-grab [&_a]:cursor-pointer [&_button]:cursor-default",
    drag.isDragActive && !drag.isDropTarget && "hover:bg-transparent",
    drag.isDragSource && "opacity-50",
    drag.isDropTarget && "bg-accent",
    drag.isSettling &&
      "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
  )
}
