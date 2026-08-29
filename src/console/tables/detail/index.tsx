import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "../../../../convex/_generated/api"
import { MoveResourceDialog } from "../../folders/move"
import { ConsolePage } from "../../page"
import { ConsolePageLayout, ConsoleScrollableGrid } from "../../shared/layout"
import { ConsoleListPager } from "../../shared/list/pager"
import { ConsoleListSkeleton } from "../../shared/list/skeleton"
import { useMaterialBreadcrumb } from "../../shared/materials/breadcrumb"
import { useMemberUrl } from "../../shared/materials/fragment"
import { EditTableDialog } from "../edit"
import { useTableRemoval } from "../manage"
import { type TableDetail } from "../types"
import { AddRowDialog } from "./add"
import { useCsvExport } from "./export"
import { RowGrid } from "./grid"
import { TableHeaderActions, TableHeading } from "./header"
import { useRowPages, useRowWrites } from "./rows"
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
        <ConsoleListSkeleton />
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
  useMaterialBreadcrumb(table.name)

  const navigate = useNavigate()
  const pages = useRowPages(organizationId, table.tableId)
  const writes = useRowWrites(organizationId, table.tableId)
  const exporter = useCsvExport(organizationId, table)
  const removal = useTableRemoval(organizationId)
  const [dialog, setDialog] = useState<TableDialog>()
  const isArchived = table.archivedAt !== undefined

  function removeAndLeaveWhenDeleted() {
    void removal.removeTable(table).then((succeeded) => {
      if (succeeded && isArchived) {
        void navigate({ to: "/tables" })
      }
    })
  }

  return (
    <ConsolePageLayout>
      <TableHeaderActions
        isArchived={isArchived}
        isExporting={exporter.isExporting}
        onAdd={() => setDialog("add")}
        onDelete={removeAndLeaveWhenDeleted}
        onEdit={() => setDialog("edit")}
        onExport={() => void exporter.exportCsv()}
        onMoveToFolder={() => setDialog("move")}
        onShare={() => setDialog("share")}
        removal={removal}
        table={table}
      />
      <TableHeading isArchived={isArchived} table={table} />
      {/* The rows scroll in place so the pager stays pinned below them,
          matching the paginated console list pages. */}
      <ConsoleScrollableGrid>
        <RowGrid
          columns={table.columns}
          disabled={isArchived}
          isLoading={pages.isLoading}
          onCommit={writes.updateCell}
          onDeleteRow={(row) => void writes.deleteRow(row)}
          pendingRowId={writes.pendingRowId}
          rows={pages.rows}
        />
      </ConsoleScrollableGrid>
      <ConsoleListPager pagination={pages} />
      <TableDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        organizationId={organizationId}
        table={table}
        writes={writes}
      />
    </ConsolePageLayout>
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
