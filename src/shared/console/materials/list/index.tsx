import { type ReactNode } from "react"
import { TableBody } from "@/components/ui/table"
import { CreatedItemRow } from "../../edit/row"
import { useCreatedItem } from "../../edit/state"
import { type DragPayload } from "../../folders/drag/plan"
import { ConsoleEmptyState, ConsoleListEmpty } from "../../list/empty"
import { ConsoleListTable } from "../../list/frame"
import { useSelectionActions } from "../../list/selection/actions"
import { MenuArea } from "../../menu/row"
import { MaterialCreateItems, MaterialEmptyState } from "./create"
import { MaterialListHead } from "./head"
import { MaterialCells, MaterialRow } from "./row"
import { type MaterialListProps, type MaterialListRow } from "./types"

export type {
  MaterialCellContext,
  MaterialColumn,
  MaterialCreate,
  MaterialListKind,
  MaterialListRow,
} from "./types"

// The list a file, table, store, or job page shows: a selection column, the
// name, whatever columns the kind declares, and the row's menu, with the
// facets and sorts riding the column heads and the empty state's offer
// telling one kind's list from another's. Every row drags onto a folder by
// its name; a selected row takes the rest of the selection with it.

export function MaterialList<Row extends MaterialListRow>(
  props: MaterialListProps<Row>
) {
  return (
    <MenuArea
      disabled={
        props.unauthorizedMessage !== undefined ||
        props.kind.creates.length === 0
      }
      menu={<MaterialCreateItems creates={props.kind.creates} />}
    >
      {/* Boxless, so the list's regions still lay out in the page. */}
      <div className="contents">
        <MaterialListRegions {...props} />
      </div>
    </MenuArea>
  )
}

function MaterialListRegions<Row extends MaterialListRow>(
  props: MaterialListProps<Row>
) {
  const { hasFilters, kind, rows, selection } = props
  const created = useCreatedItem(kind.creationKind ?? "title")
  const selectionActions = useSelectionActions(
    selection,
    props.selectionActions
  )

  if (props.unauthorizedMessage !== undefined) {
    return (
      <ConsoleListEmpty>
        <ConsoleEmptyState
          description={props.unauthorizedMessage}
          icon={kind.icon}
          title={`Could not load ${kind.noun.plural}`}
        />
      </ConsoleListEmpty>
    )
  }

  if (rows.length === 0 && !hasFilters && !created) {
    return (
      <ConsoleListEmpty>
        <MaterialEmptyState hasFilters={false} kind={kind} />
      </ConsoleListEmpty>
    )
  }

  return (
    <>
      <MaterialTable
        {...props}
        created={created}
        selectionMenu={selectionActions.menu}
      />
      {rows.length === 0 && !created ? (
        <ConsoleListEmpty>
          <MaterialEmptyState hasFilters kind={kind} />
        </ConsoleListEmpty>
      ) : null}
      {selectionActions.dock}
    </>
  )
}

/** The table itself: the head, a row still being named, then the rest. */
function MaterialTable<Row extends MaterialListRow>({
  created,
  selectionMenu,
  ...props
}: MaterialListProps<Row> & {
  created: ReturnType<typeof useCreatedItem>
  selectionMenu: ReactNode
}) {
  const { config, controls, kind, rows, selection } = props
  const visible = created
    ? rows.filter((row) => kind.identify(row) !== created.item.id)
    : rows
  const selected: DragPayload = {
    folders: [],
    resources: selection.selected.map(kind.drag),
  }

  return (
    <ConsoleListTable
      aria-label={kind.noun.plural}
      fill={rows.length > 0 || !!created}
      selection={selection}
    >
      <MaterialListHead
        columns={kind.columns}
        config={config}
        controls={controls}
        selection={selection}
      />
      <TableBody>
        {created ? (
          <CreatedItemRow edit={created}>
            <MaterialCells
              kind={kind}
              folders={props.folders}
              row={
                rows.find((row) => kind.identify(row) === created.item.id) ??
                kind.createdRow?.(created.item)
              }
              inert
            />
          </CreatedItemRow>
        ) : null}
        {visible.map((row) => (
          <MaterialRow
            key={kind.identify(row)}
            row={row}
            selected={selected}
            selectionMenu={selectionMenu}
            {...props}
          />
        ))}
      </TableBody>
    </ConsoleListTable>
  )
}
