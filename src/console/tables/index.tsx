import { type useFolderNames } from "@/console/shared/materials/names"
import {
  type ListConfig,
  type ListControls,
} from "@/shared/console/list/controls"
import {
  ConsoleListFooter,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { type useClientPagination } from "@/shared/console/list/pagination"
import { type RowSelection } from "@/shared/console/list/selection"
import { ConsolePage } from "../page"
import { TableRowDialogs, TablesOverlays } from "./dialogs"
import { TableList, TablesToolbar } from "./list"
import { type useTableRemoval } from "./manage"
import { toMoveTarget, useTablesPage } from "./page"
import { type TableListResult, type TableSummary } from "./types"

export function TablesPage() {
  return (
    <ConsolePage>
      {(organizationId) => <TablesView organizationId={organizationId} />}
    </ConsolePage>
  )
}

function TablesView({ organizationId }: { organizationId: string }) {
  const page = useTablesPage(organizationId)

  return (
    <ConsoleListLayout>
      <TablesToolbar
        onCreate={() => page.setDialog("create")}
        onImport={() => page.setDialog("import")}
        onQueryChange={page.setQueryAndReset}
        query={page.query}
      />
      <TablesBody
        config={page.config}
        controls={page.controls}
        folders={page.folders}
        hasFilters={page.hasFilters}
        onAccess={page.setSharing}
        onCreate={() => page.setDialog("create")}
        onEdit={page.setEditing}
        onImport={() => page.setDialog("import")}
        onMoveToFolder={(table) => page.setMoving([toMoveTarget(table)])}
        pagination={page.pagination}
        removal={page.removal}
        selection={page.selection}
        tableList={page.tableList}
      />
      <TablesOverlays organizationId={organizationId} page={page} />
      <TableRowDialogs organizationId={organizationId} page={page} />
    </ConsoleListLayout>
  )
}

function TablesBody({
  config,
  controls,
  folders,
  hasFilters,
  onAccess,
  onCreate,
  onEdit,
  onImport,
  onMoveToFolder,
  pagination,
  removal,
  selection,
  tableList,
}: {
  config: ListConfig<TableSummary>
  controls: ListControls
  folders: ReturnType<typeof useFolderNames>
  hasFilters: boolean
  onAccess: (table: TableSummary) => void
  onCreate: () => void
  onEdit: (table: TableSummary) => void
  onImport: () => void
  onMoveToFolder: (table: TableSummary) => void
  pagination: ReturnType<typeof useClientPagination<TableSummary>>
  removal: ReturnType<typeof useTableRemoval>
  selection: RowSelection<TableSummary>
  tableList: TableListResult | undefined
}) {
  if (tableList === undefined) {
    return <ConsoleListLoading />
  }

  return (
    <>
      <TableList
        config={config}
        controls={controls}
        folders={folders}
        hasFilters={hasFilters}
        onAccess={onAccess}
        onCreate={onCreate}
        onEdit={onEdit}
        onImport={onImport}
        onMoveToFolder={onMoveToFolder}
        removal={removal}
        selection={selection}
        tables={pagination.visibleRows}
        unauthorizedMessage={
          tableList.status === "unauthorized" ? tableList.message : undefined
        }
      />
      {tableList.status === "ready" ? (
        <ConsoleListFooter>
          <ConsoleListPager pagination={pagination} />
        </ConsoleListFooter>
      ) : null}
    </>
  )
}
