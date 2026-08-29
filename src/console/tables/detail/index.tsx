import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "../../../../convex/_generated/api"
import { MoveResourceDialog } from "../../folders/move"
import { ConsolePage } from "../../page"
import { ConsolePageLayout } from "../../shared/layout"
import { ConsoleListFooter, ConsoleListLayout } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
import { ConsoleListPager } from "../../shared/list/pager"
import { useMaterialBreadcrumb } from "../../shared/materials/breadcrumb"
import { useMemberUrl } from "../../shared/materials/fragment"
import { EditTableDialog } from "../edit"
import { useTableRemoval } from "../manage"
import { rowPageSize, type TableDetail } from "../types"
import { AddRowDialog } from "./add"
import { ColumnAddPopover } from "./columns"
import { useCsvExport } from "./export"
import { RowGrid } from "./grid"
import { TableHeaderActions } from "./header"
import { useRowAdding, useRowPages, useRowWrites } from "./rows"
import { TableLinksDialog } from "./share"

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

type TableDialog = "add" | "edit" | "move" | "share"

function TableReadyView({
  organizationId,
  table,
}: {
  organizationId: string
  table: TableDetail
}) {
  useMemberUrl()
  useMaterialBreadcrumb(table.name, table.scope)

  const navigate = useNavigate()
  const pages = useRowPages(organizationId, table.tableId)
  const writes = useRowWrites(organizationId, table.tableId)
  const exporter = useCsvExport(organizationId, table)
  const removal = useTableRemoval(organizationId)
  const [dialog, setDialog] = useState<TableDialog>()
  const adding = useRowAdding(table.columns, writes.insertRow, () =>
    setDialog("add")
  )
  const isArchived = table.archivedAt !== undefined

  function removeAndLeaveWhenDeleted() {
    void removal.removeTable(table).then((succeeded) => {
      if (succeeded && isArchived) {
        void navigate({ to: "/tables" })
      }
    })
  }

  return (
    <ConsoleListLayout>
      <TableHeaderActions
        isArchived={isArchived}
        isExporting={exporter.isExporting}
        onAdd={() => void adding.addRow()}
        onDelete={removeAndLeaveWhenDeleted}
        onEdit={() => setDialog("edit")}
        onExport={() => void exporter.exportCsv()}
        onMoveToFolder={() => setDialog("move")}
        onShare={() => setDialog("share")}
        removal={removal}
        table={table}
      />
      <TableGrid
        adding={adding}
        isArchived={isArchived}
        organizationId={organizationId}
        pages={pages}
        table={table}
        writes={writes}
      />
      <ConsoleListFooter>
        <ConsoleListPager pagination={pages} />
      </ConsoleListFooter>
      <TableDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        organizationId={organizationId}
        table={table}
        writes={writes}
      />
    </ConsoleListLayout>
  )
}

function TableGrid({
  adding,
  isArchived,
  organizationId,
  pages,
  table,
  writes,
}: {
  adding: ReturnType<typeof useRowAdding>
  isArchived: boolean
  organizationId: string
  pages: ReturnType<typeof useRowPages>
  table: TableDetail
  writes: ReturnType<typeof useRowWrites>
}) {
  return (
    <RowGrid
      columnAdder={
        <ColumnAddPopover
          disabled={isArchived}
          organizationId={organizationId}
          table={table}
        />
      }
      columns={table.columns}
      disabled={isArchived}
      freshRowId={adding.freshRowId}
      isLoading={pages.isLoading}
      offset={pages.pageIndex * rowPageSize}
      onAddRow={() => void adding.addRow()}
      onCommit={writes.updateCell}
      onDeleteRow={(row) => void writes.deleteRow(row)}
      onFreshSettled={adding.settle}
      pendingRowId={writes.pendingRowId}
      rows={pages.rows}
    />
  )
}

function TableDialogs({
  dialog,
  onClose,
  organizationId,
  table,
  writes,
}: {
  dialog: TableDialog | undefined
  onClose: () => void
  organizationId: string
  table: TableDetail
  writes: ReturnType<typeof useRowWrites>
}) {
  function closeWhenDismissed(open: boolean) {
    if (!open) {
      onClose()
    }
  }

  return (
    <>
      <AddRowDialog
        columns={table.columns}
        isOpen={dialog === "add"}
        onOpenChange={closeWhenDismissed}
        onSubmit={writes.insertRow}
      />
      <EditTableDialog
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
        table={dialog === "edit" ? table : undefined}
      />
      <TableLinksDialog
        onOpenChange={closeWhenDismissed}
        open={dialog === "share"}
        organizationId={organizationId}
        tableId={table.tableId}
      />
      <MoveResourceDialog
        onClose={onClose}
        organizationId={organizationId}
        resource={
          dialog === "move"
            ? {
                resourceType: "collection",
                resourceId: table.tableId,
                name: table.name,
                folderId: table.folderId,
              }
            : undefined
        }
      />
    </>
  )
}
