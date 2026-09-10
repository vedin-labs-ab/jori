import { cn } from "@/lib/utils"
import { type DragSource } from "./state"

/** What a row hands its element to take part in a drag: the source
 *  wiring, and the states the row's styling reads. */
export type RowDrag = DragSource & {
  isDragActive: boolean
  isDropTarget?: boolean
  isSettling?: boolean
}

/** The row and its primary link share the grab cursor. Separate links and
 *  controls keep their own cursors; the drag provider switches to grabbing
 *  once movement activates a drag. */
export function rowDragClasses(drag: {
  isDragActive: boolean
  isDragSource: boolean
  isDropTarget?: boolean
  isSettling?: boolean
}) {
  return cn(
    "cursor-grab [&_a]:cursor-pointer [&_[data-row-link]_a]:cursor-grab [&_button]:cursor-default",
    drag.isDragActive && !drag.isDropTarget && "hover:bg-transparent",
    drag.isDragSource && "opacity-50",
    drag.isDropTarget && "bg-accent",
    drag.isSettling &&
      "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
  )
}
