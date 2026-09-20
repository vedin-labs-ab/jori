import { Plus, Table2, Upload } from "lucide-react"
import { type ComponentProps } from "react"
import { type ResourceDragItem } from "@/shared/console/folders/drag/plan"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "@/shared/console/layout"
import {
  type MaterialListActions,
  materialRowMenu,
} from "@/shared/console/materials/actions/list"
import {
  materialColumns,
  measureColumn,
} from "@/shared/console/materials/cells/columns"
import { MaterialList } from "@/shared/console/materials/list"
import { type TableSummary } from "@/shared/console/tables/types"
import { TableColumnsCell, TableNameCell, TableRowsCell } from "./cells"
import { tableDeleteDescription, tableNoun } from "./config"

export function TablesToolbar({
  onCreate,
  onImport,
  onQueryChange,
  query,
}: {
  onCreate: () => void
  onImport: () => void
  onQueryChange: (query: string) => void
  query: string
}) {
  return (
    <ConsoleHeaderActions>
      <ConsoleSearch
        label="Search tables"
        onValueChange={onQueryChange}
        value={query}
      />
      <ConsoleHeaderButton
        icon={<Upload />}
        label="Import"
        onClick={onImport}
        type="button"
        variant="outline"
      />
      <ConsoleHeaderButton
        icon={<Plus />}
        data-create-kind="table"
        label="New table"
        onClick={onCreate}
        type="button"
      />
    </ConsoleHeaderActions>
  )
}

const identify = (table: TableSummary) => table.tableId

const drag = (table: TableSummary): ResourceDragItem => ({
  type: "table",
  id: table.tableId,
  name: table.name,
  folderId: table.folderId,
})

const columns = materialColumns<TableSummary>([
  measureColumn(
    "Columns",
    "columns",
    (table) => <TableColumnsCell table={table} />,
    "2xl"
  ),
  measureColumn(
    "Rows",
    "rows",
    (table) => <TableRowsCell table={table} />,
    "md"
  ),
])

export function TableList({
  onAccess,
  onCreate,
  onImport,
  onMoveToFolder,
  removal,
  tables,
  ...props
}: Omit<ComponentProps<typeof MaterialList<TableSummary>>, "kind" | "rows"> &
  MaterialListActions<TableSummary> & {
    onCreate: () => void
    onImport: () => void
    tables: TableSummary[]
  }) {
  return (
    <MaterialList
      {...props}
      kind={{
        editKind: "table",
        createdRow: (item) => item.table,
        columns,
        creates: [
          { icon: Plus, label: "New table", onSelect: onCreate },
          { icon: Upload, label: "Import", onSelect: onImport },
        ],
        description:
          "Typed tables Jori and your team keep structured records in appear here.",
        drag,
        icon: Table2,
        identify,
        menu: materialRowMenu(
          {
            deleteDescription: tableDeleteDescription,
            editKind: "table",
            identify,
            noun: tableNoun.singular,
          },
          { onAccess, onMoveToFolder, removal }
        ),
        nameCell: (table) => <TableNameCell table={table} />,
        noun: tableNoun,
      }}
      rows={tables}
    />
  )
}
