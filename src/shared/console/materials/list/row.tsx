import { type ReactNode } from "react"
import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { type DragPayload } from "../../folders/drag/plan"
import { useResourceRowDrag } from "../../folders/drag/state"
import { columnTier, nameColumnClassName } from "../../list/controls"
import { ListRow } from "../../list/pointer/row"
import { SelectionRowCell } from "../../list/selection/bar"
import { useNow } from "../../time"
import { type FolderNames } from "../folders"
import {
  type MaterialListKind,
  type MaterialListProps,
  type MaterialListRow,
} from "./types"

/** One material's row: it drags onto a folder by its name, and a selected
 *  row takes the rest of the selection with it. */
export function MaterialRow<Row extends MaterialListRow>({
  folders,
  kind,
  row,
  selected,
  selection,
  selectionMenu,
}: MaterialListProps<Row> & {
  row: Row
  selected: DragPayload
  selectionMenu: ReactNode
}) {
  const drag = useResourceRowDrag(kind.drag(row), selected)

  return (
    <ListRow
      drag={drag}
      row={row}
      selection={selection}
      selectionMenu={selectionMenu}
    >
      <SelectionRowCell
        label={`Select ${row.name}`}
        row={row}
        selection={selection}
      />
      <TableCell data-row-link className={nameColumnClassName}>
        {kind.nameCell(row)}
      </TableCell>
      <MaterialCells kind={kind} row={row} folders={folders} />
      <TableCell className="text-right">{kind.menu(row)}</TableCell>
    </ListRow>
  )
}

export function MaterialCells<Row>({
  kind,
  row,
  folders,
  inert,
}: {
  kind: MaterialListKind<Row>
  row: Row | undefined
  folders: FolderNames | undefined
  inert?: boolean
}) {
  const now = useNow(30_000)
  const context = { folders, now }
  return (
    <>
      {kind.columns.map((column) => (
        <TableCell
          key={column.label}
          className={cn(column.className, columnTier[column.tier])}
          inert={inert}
          title={row === undefined ? undefined : column.title?.(row)}
        >
          {row === undefined ? (
            <span className="text-muted-foreground/60">&mdash;</span>
          ) : (
            column.cell(row, context)
          )}
        </TableCell>
      ))}
    </>
  )
}
