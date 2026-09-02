import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { countLabel } from "@/shared/console/count"
import { ConsolePageLayout } from "@/shared/console/layout"
import {
  ConsoleListFooter,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { useRowSelection } from "@/shared/console/list/selection"
import { MaterialTitleMenu } from "@/shared/console/materials/actions/menu"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { useMemberUrl } from "@/shared/console/materials/fragment"
import { RowGrid } from "@/shared/console/tables/grid"
import { TableHeaderActions } from "@/shared/console/tables/header"
import { type ColumnSheetState } from "@/shared/console/tables/sheet"
import { type TableDetail, type TableRow } from "@/shared/console/tables/types"
import { api } from "../../../../convex/_generated/api"
import { ConsolePage } from "../../page"
import { tableDeleteDescription, useTableRemoval } from "../manage"
import { useCsvExport } from "./export"
import { type TableDialog, TableOverlays } from "./overlays"
import { useRowAdding, useRowBulk, useRowPages, useRowWrites } from "./rows"

/** Member view of one table. The share fork wraps exactly this component,
 *  so it owns everything inside the console chrome. A visitor holding a
 *  share secret who cannot see the table falls back to the share view. */
export function TableView({
  fallback,
  tableId,
}: {
  fallback?: ReactNode
  tableId: GenericId<"collections">
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <TableViewContent
          fallback={fallback}
          organizationId={organizationId}
          tableId={tableId}
        />
      )}
    </ConsolePage>
  )
}

function TableViewContent({
  fallback,
  organizationId,
  tableId,
}: {
  fallback: ReactNode | undefined
  organizationId: string
  tableId: GenericId<"collections">
}) {
  const result = useQuery(api.tables.console.get, { organizationId, tableId })

  if (result === undefined) {
    return (
      <ConsolePageLayout>
        <ConsoleListLoading />
      </ConsolePageLayout>
    )
  }

  if (result.status === "unauthorized") {
    return (
      fallback ?? (
        <ConsolePageLayout>
          <Alert variant="destructive">
            <AlertTitle>Could not load table</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        </ConsolePageLayout>
      )
    )
  }

  if (result.status === "not_found" || result.table === null) {
    return (
      fallback ?? (
        <ConsolePageLayout>
          <Alert>
            <AlertTitle>Table not found</AlertTitle>
            <AlertDescription>
              The table may have been deleted or belongs to another
              organization.
            </AlertDescription>
          </Alert>
        </ConsolePageLayout>
      )
    )
  }

  return <TableReadyView organizationId={organizationId} table={result.table} />
}

/** One bag of page state, so the view, grid, and overlays stay small. */
function useTablePage(organizationId: string, table: TableDetail) {
  const pages = useRowPages(organizationId, table.tableId)
  const writes = useRowWrites(organizationId, table.tableId)
  const selection = useRowSelection({
    identify: (row: TableRow) => row.rowId,
    rows: pages.rows,
  })
  const [dialog, setDialog] = useState<TableDialog>()
  const [columnSheet, setColumnSheet] = useState<ColumnSheetState>()

  return {
    adding: useRowAdding(table.columns, writes.insertRow, () =>
      setDialog("add")
    ),
    bulk: useRowBulk(organizationId, table.tableId, selection),
    columnSheet,
    dialog,
    exporter: useCsvExport(organizationId, table),
    pages,
    removal: useTableRemoval(organizationId),
    selection,
    setColumnSheet,
    setDialog,
    writes,
  }
}

function TableReadyView({
  organizationId,
  table,
}: {
  organizationId: string
  table: TableDetail
}) {
  useMemberUrl()

  const navigate = useNavigate()
  const page = useTablePage(organizationId, table)
  const isArchived = table.archivedAt !== undefined

  function removeAndLeaveWhenDeleted() {
    void page.removal.removeMaterial(table).then((succeeded) => {
      if (succeeded && isArchived) {
        void navigate({ to: "/tables" })
      }
    })
  }

  useMaterialBreadcrumb(
    table.name,
    <MaterialTitleMenu
      deleteDescription={tableDeleteDescription}
      isDeleting={page.removal.removingId === table.tableId}
      isRestoring={page.removal.restoringId === table.tableId}
      material={{ name: table.name, archivedAt: table.archivedAt }}
      noun="table"
      onAccess={() => page.setDialog("access")}
      onDelete={removeAndLeaveWhenDeleted}
      onEdit={() => page.setDialog("edit")}
      onMoveToFolder={() => page.setDialog("move")}
      onRestore={() => void page.removal.restoreMaterial(table)}
    />
  )

  return (
    <ConsoleListLayout>
      <TableHeaderActions
        isExporting={page.exporter.isExporting}
        onExport={() => void page.exporter.exportCsv()}
        onShare={() => page.setDialog("share")}
      />
      <TableGrid isArchived={isArchived} page={page} table={table} />
      <ConsoleListFooter>
        <p className="text-muted-foreground text-xs">
          {countLabel(table.rowCount, "row")}
        </p>
      </ConsoleListFooter>
      <TableOverlays
        bulk={page.bulk}
        columnSheet={page.columnSheet}
        dialog={page.dialog}
        onAddRow={page.adding.submitDialog}
        onCloseDialog={() => page.setDialog(undefined)}
        onColumnSheet={page.setColumnSheet}
        organizationId={organizationId}
        selection={page.selection}
        table={table}
      />
    </ConsoleListLayout>
  )
}

function TableGrid({
  isArchived,
  page,
  table,
}: {
  isArchived: boolean
  page: ReturnType<typeof useTablePage>
  table: TableDetail
}) {
  return (
    <RowGrid
      columns={table.columns}
      disabled={isArchived}
      freshRowId={page.adding.freshRowId}
      isExhausted={page.pages.isExhausted}
      isLoading={page.pages.isLoading}
      isLoadingMore={page.pages.isLoadingMore}
      loadMore={page.pages.loadMore}
      onAddColumn={() => page.setColumnSheet({ mode: "create" })}
      onAddRow={() => void page.adding.addRow()}
      onCommit={page.writes.updateCell}
      onDeleteRow={(row) => void page.writes.deleteRow(row)}
      onDuplicateRow={(row) => void page.writes.duplicateRow(row)}
      onFreshSettled={page.adding.settle}
      onInsertRow={(row, placement) =>
        void page.adding.addRow({ rowId: row.rowId, placement })
      }
      onInspectColumn={(column) =>
        page.setColumnSheet({ mode: "edit", id: column.id })
      }
      pendingRowId={page.writes.pendingRowId}
      rows={page.pages.rows}
      selection={page.selection}
    />
  )
}
