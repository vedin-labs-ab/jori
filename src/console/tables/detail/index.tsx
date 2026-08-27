import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { api } from "../../../../convex/_generated/api"
import { type Id } from "../../../../convex/_generated/dataModel"
import { ConsolePage } from "../../page"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsolePageLayout,
} from "../../shared/layout"
import { ConsoleListPager } from "../../shared/list/pager"
import { ConsoleListSkeleton } from "../../shared/list/skeleton"
import { MaterialActions } from "../../shared/materials/actions"
import { MaterialScopeBadge } from "../../shared/materials/scope"
import { EditTableDialog } from "../edit"
import { tableDeleteDescription, useTableRemoval } from "../manage"
import { type TableDetail } from "../types"
import { AddRowDialog } from "./add"
import { RowGrid } from "./grid"
import { useRowPages, useRowWrites } from "./rows"

/** Member view of one table. The later share fork wraps exactly this
 *  component, so it owns everything inside the console chrome. */
export function TableView({ tableId }: { tableId: Id<"tables"> }) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <TableViewContent organizationId={organizationId} tableId={tableId} />
      )}
    </ConsolePage>
  )
}

function TableViewContent({
  organizationId,
  tableId,
}: {
  organizationId: string
  tableId: Id<"tables">
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
      <ConsolePageLayout>
        <Alert variant="destructive">
          <AlertTitle>Could not load table</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      </ConsolePageLayout>
    )
  }

  if (result.status === "not_found" || result.table === null) {
    return (
      <ConsolePageLayout>
        <Alert>
          <AlertTitle>Table not found</AlertTitle>
          <AlertDescription>
            The table may have been deleted or belongs to another organization.
          </AlertDescription>
        </Alert>
      </ConsolePageLayout>
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
  const navigate = useNavigate()
  const pages = useRowPages(organizationId, table.tableId)
  const writes = useRowWrites(organizationId, table.tableId)
  const removal = useTableRemoval(organizationId)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
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
        onDelete={removeAndLeaveWhenDeleted}
        onEdit={() => setIsEditOpen(true)}
        onAdd={() => setIsAddOpen(true)}
        removal={removal}
        table={table}
      />
      <TableHeading isArchived={isArchived} table={table} />
      <RowGrid
        columns={table.columns}
        disabled={isArchived}
        isLoading={pages.isLoading}
        onCommit={writes.updateCell}
        onDeleteRow={(row) => void writes.deleteRow(row)}
        pendingRowId={writes.pendingRowId}
        rows={pages.rows}
      />
      <ConsoleListPager pagination={pages} />
      <AddRowDialog
        columns={table.columns}
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={writes.insertRow}
      />
      <EditTableDialog
        onOpenChange={setIsEditOpen}
        organizationId={organizationId}
        table={isEditOpen ? table : undefined}
      />
    </ConsolePageLayout>
  )
}

function TableHeaderActions({
  isArchived,
  onAdd,
  onDelete,
  onEdit,
  removal,
  table,
}: {
  isArchived: boolean
  onAdd: () => void
  onDelete: () => void
  onEdit: () => void
  removal: ReturnType<typeof useTableRemoval>
  table: TableDetail
}) {
  return (
    <ConsoleHeaderActions>
      <ConsoleHeaderButton
        icon={<Pencil />}
        label="Edit table"
        onClick={onEdit}
        type="button"
        variant="outline"
      />
      <ConsoleHeaderButton
        disabled={isArchived}
        icon={<Plus />}
        label="Add row"
        onClick={onAdd}
        type="button"
      />
      <MaterialActions
        deleteDescription={tableDeleteDescription}
        isDeleting={removal.removingTableId === table.tableId}
        isRestoring={removal.restoringTableId === table.tableId}
        material={{ name: table.name, archivedAt: table.archivedAt }}
        noun="table"
        onDelete={onDelete}
        onRestore={() => void removal.restoreTable(table)}
      />
    </ConsoleHeaderActions>
  )
}

function TableHeading({
  isArchived,
  table,
}: {
  isArchived: boolean
  table: TableDetail
}) {
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium text-lg tracking-tight">{table.name}</h2>
        <MaterialScopeBadge scope={table.scope} />
        {isArchived ? <Badge variant="secondary">Archived</Badge> : null}
      </div>
      {table.description === undefined ? null : (
        <p className="text-muted-foreground text-sm">{table.description}</p>
      )}
      {isArchived ? (
        <p className="text-muted-foreground text-xs">
          Archived tables are read-only. Restore the table to change rows.
        </p>
      ) : null}
    </div>
  )
}
