import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { AskJoriAction } from "@/shared/console/chat/pane/ask"
import { countLabel } from "@/shared/console/count"
import {
  ConsoleListFooter,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import { MaterialTitleMenu } from "@/shared/console/materials/actions/menu"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { MaterialHeaderActions } from "@/shared/console/materials/detail/header"
import { MaterialPlaceholder } from "@/shared/console/materials/detail/placeholder"
import { useMemberUrl } from "@/shared/console/materials/fragment"
import { RowGrid } from "@/shared/console/tables/grid"
import { tableDeleteDescription } from "@/shared/console/tables/list/config"
import { TableLead } from "@/shared/console/tables/menu"
import { type TableDetail } from "@/shared/console/tables/types"
import { VisibilityButton } from "@/shared/console/visibility/badge"
import { api } from "../../../../convex/_generated/api"
import { ConsolePage } from "../../page"
import { useTableRemoval } from "../manage"
import { useCsvExport } from "./export"
import { useTableGrid } from "./grid"
import { type TableDialog, TableDialogs } from "./overlays"

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
    return <MaterialPlaceholder noun="table" status="loading" />
  }

  if (result.status === "unauthorized") {
    return (
      <MaterialPlaceholder
        fallback={fallback}
        message={result.message}
        noun="table"
        status="unauthorized"
      />
    )
  }

  if (result.status === "not_found" || result.table === null) {
    return (
      <MaterialPlaceholder
        fallback={fallback}
        noun="table"
        status="not_found"
      />
    )
  }

  return <TableReadyView organizationId={organizationId} table={result.table} />
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
  const grid = useTableGrid(organizationId, table)
  const exporter = useCsvExport(organizationId, table)
  const removal = useTableRemoval(organizationId)
  const [dialog, setDialog] = useState<TableDialog>()
  const isArchived = table.archivedAt !== undefined

  function removeAndLeaveWhenDeleted() {
    void removal.removeMaterial(table).then((succeeded) => {
      if (succeeded && isArchived) {
        void navigate({ to: "/tables" })
      }
    })
  }

  useMaterialBreadcrumb(
    table.name,
    <MaterialTitleMenu
      deleteDescription={tableDeleteDescription}
      isDeleting={removal.removingId === table.tableId}
      isRestoring={removal.restoringId === table.tableId}
      lead={<TableLead table={table} />}
      material={{ name: table.name, archivedAt: table.archivedAt }}
      noun="table"
      onAccess={() => setDialog("access")}
      onDelete={removeAndLeaveWhenDeleted}
      onEdit={() => setDialog("edit")}
      onMoveToFolder={() => setDialog("move")}
      onRestore={() => void removal.restoreMaterial(table)}
    />,
    <VisibilityButton {...table} onClick={() => setDialog("access")} />
  )

  return (
    <ConsoleListLayout>
      <MaterialHeaderActions
        isExporting={exporter.isExporting}
        onExport={() => void exporter.exportCsv()}
        onShare={() => setDialog("share")}
      >
        <AskJoriAction target={{ kind: "table", id: table.tableId }} />
      </MaterialHeaderActions>
      <RowGrid {...grid.props} />
      <ConsoleListFooter>
        <p className="text-muted-foreground text-xs">
          {countLabel(table.rowCount, "row")}
        </p>
      </ConsoleListFooter>
      {grid.overlays}
      <TableDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        organizationId={organizationId}
        table={table}
      />
    </ConsoleListLayout>
  )
}
