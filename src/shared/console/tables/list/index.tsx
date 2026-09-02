import { Plus, Table2, Upload } from "lucide-react"
import { type ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "@/shared/console/layout"
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
        label="New table"
        onClick={onCreate}
        type="button"
      />
    </ConsoleHeaderActions>
  )
}

export function TableList({
  onCreate,
  onImport,
  tables,
  ...props
}: Omit<ComponentProps<typeof MaterialList<TableSummary>>, "kind" | "rows"> & {
  onCreate: () => void
  onImport: () => void
  tables: TableSummary[]
}) {
  return (
    <MaterialList
      {...props}
      kind={{
        action: (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={onCreate} type="button">
              <Plus />
              New table
            </Button>
            <Button onClick={onImport} type="button" variant="outline">
              <Upload />
              Import
            </Button>
          </div>
        ),
        deleteDescription: tableDeleteDescription,
        description:
          "Typed tables Jori and your team keep structured records in appear here.",
        icon: Table2,
        identify: (table) => table.tableId,
        measures: [
          {
            cell: (table) => <TableColumnsCell table={table} />,
            label: "Columns",
            sortKey: "columns",
          },
          {
            cell: (table) => <TableRowsCell table={table} />,
            label: "Rows",
            sortKey: "rows",
          },
        ],
        nameCell: (table) => <TableNameCell table={table} />,
        noun: tableNoun,
      }}
      rows={tables}
    />
  )
}
