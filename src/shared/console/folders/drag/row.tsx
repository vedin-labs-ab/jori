import { type ComponentProps } from "react"
import { TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { type RowDrag, rowDragClasses } from "./style"

/** A list row wired as a drag source — and, for folders, a drop target —
 *  the same way on every listing: material lists, the files list, and
 *  the folder pages all spread the one set of props. */
export function DraggableTableRow({
  className,
  drag,
  ...props
}: ComponentProps<typeof TableRow> & { drag: RowDrag }) {
  return (
    <TableRow
      {...props}
      {...drag.attributes}
      {...drag.listeners}
      className={cn(rowDragClasses(drag), className)}
      onClickCapture={drag.onClickCapture}
      onPointerDownCapture={drag.onPointerDownCapture}
      ref={drag.setNodeRef}
    />
  )
}
