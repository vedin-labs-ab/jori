import { cn } from "@/lib/utils"

/** Drag styling for a listing row, mirroring the sidebar's: the source
 *  dims, the hovered valid target takes the accent, plain hover goes quiet
 *  while a drag runs, and a landed move fades the row in where it settled
 *  — unless the user prefers reduced motion. */
export function rowDragClasses(drag: {
  isDragActive: boolean
  isDragSource: boolean
  isDropTarget?: boolean
  isSettling?: boolean
}) {
  return cn(
    drag.isDragActive && !drag.isDropTarget && "hover:bg-transparent",
    drag.isDragSource && "opacity-50",
    drag.isDropTarget && "bg-accent",
    drag.isSettling &&
      "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
  )
}

/** Name-cell link class for folder listings. The width cap sits on the link
 *  itself, not the table cell — browsers ignore max-width on table cells
 *  when sizing auto-layout columns — so a long name truncates inside the
 *  capped link instead of widening the column. */
export const nameLinkClassName =
  "flex max-w-64 items-center gap-2 font-medium hover:underline"
