import { useState } from "react"
import { useEditing } from "@/shared/console/edit/state"
import { moveTarget } from "@/shared/console/folders/types"
import { SelectionActionsBar } from "@/shared/console/list/bar"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { ConsoleListBody } from "@/shared/console/list/pager"
import { bulkMaterialRemoval } from "@/shared/console/materials/removal"
import { closeOnDismiss } from "@/shared/console/retain"
import { TableList, TablesToolbar } from "@/shared/console/tables/list"
import {
  tableDeleteDescription,
  tableListConfig,
  tableNoun,
} from "@/shared/console/tables/list/config"
import { type TableSummary } from "@/shared/console/tables/types"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { useMaterialListPage } from "../shared/materials/list"
import { OrganizationVisibilityDialog } from "../shared/visibility/dialog"
import { EditTableDialog } from "./edit"
import { ImportTableDialog } from "./import/dialog"
import { useTableBulk, useTableRemoval } from "./manage"

export function TablesPage() {
  return (
    <ConsolePage>
      {(organizationId) => <TablesView organizationId={organizationId} />}
    </ConsolePage>
  )
}

function useTablesPage(organizationId: string) {
  const [dialog, setDialog] = useState<"import">()
  const page = useMaterialListPage({
    config: tableListConfig,
    identify: (table: TableSummary) => table.tableId,
    listQuery: api.tables.console.list,
    noun: tableNoun,
    organizationId,
    rowsOf: (result) => (result.status === "ready" ? result.tables : []),
  })

  return {
    ...page,
    bulk: useTableBulk(organizationId, page.selection),
    dialog,
    removal: useTableRemoval(organizationId),
    setDialog,
  }
}

function TablesView({ organizationId }: { organizationId: string }) {
  const page = useTablesPage(organizationId)
  const editing = useEditing()
  const openCreate = () => editing?.create("table", undefined, "table")
  const openImport = () => page.setDialog("import")

  return (
    <ConsoleListLayout>
      <TablesToolbar
        onCreate={openCreate}
        onImport={openImport}
        onQueryChange={page.setQueryAndReset}
        query={page.query}
      />
      <ConsoleListBody
        isLoading={page.list === undefined}
        pagination={page.list?.status === "ready" ? page.pagination : undefined}
      >
        <TableList
          config={page.config}
          controls={page.controls}
          folders={page.folders}
          hasFilters={page.hasFilters}
          onAccess={page.setSharing}
          onCreate={openCreate}
          onEdit={page.setEditing}
          onImport={openImport}
          onMoveToFolder={(table) => page.setMoving([toMoveTarget(table)])}
          removal={page.removal}
          selection={page.selection}
          tables={page.pagination.visibleRows}
          unauthorizedMessage={
            page.list?.status === "unauthorized" ? page.list.message : undefined
          }
        />
      </ConsoleListBody>
      <TablesOverlays organizationId={organizationId} page={page} />
      <TableRowDialogs organizationId={organizationId} page={page} />
    </ConsoleListLayout>
  )
}

/** The selection bar and the page's dialogs — everything that floats over
 *  the list. */
function TablesOverlays({
  organizationId,
  page,
}: {
  organizationId: string
  page: ReturnType<typeof useTablesPage>
}) {
  return (
    <>
      <SelectionActionsBar
        count={page.selection.count}
        isBusy={page.bulk.isBusy}
        noun={tableNoun}
        onClear={page.selection.clear}
        onDownload={page.bulk.downloadSelected}
        onMove={() => page.setMoving(page.selection.selected.map(toMoveTarget))}
        onRemove={page.bulk.removeSelected}
        removal={bulkMaterialRemoval(
          page.selection.selected,
          tableNoun,
          tableDeleteDescription
        )}
      />

      <ImportTableDialog
        isOpen={page.dialog === "import"}
        onOpenChange={(open) => page.setDialog(open ? "import" : undefined)}
        organizationId={organizationId}
      />
      <MoveResourcesDialog
        onClose={() => page.setMoving(undefined)}
        organizationId={organizationId}
        resources={page.moving}
      />
    </>
  )
}

/** What a row's Rename… and Sharing… open, hosted once for the list. */
function TableRowDialogs({
  organizationId,
  page,
}: {
  organizationId: string
  page: ReturnType<typeof useTablesPage>
}) {
  return (
    <>
      <EditTableDialog
        onOpenChange={closeOnDismiss(() => page.setEditing(undefined))}
        organizationId={organizationId}
        table={page.editing}
      />
      {page.sharing === undefined ? null : (
        <OrganizationVisibilityDialog
          noun="table"
          onOpenChange={closeOnDismiss(() => page.setSharing(undefined))}
          open
          organizationId={organizationId}
          ownerId={page.sharing.ownerId}
          target={{ kind: "table", id: page.sharing.tableId }}
          value={page.sharing.visibility}
        />
      )}
    </>
  )
}

function toMoveTarget(table: TableSummary) {
  return moveTarget("collection", table.tableId, table)
}
