import { SelectionActionsBar } from "@/shared/console/list/bar"
import { bulkMaterialRemoval } from "@/shared/console/materials/removal"
import {
  tableDeleteDescription,
  tableNoun,
} from "@/shared/console/tables/list/config"
import { MoveResourcesDialog } from "../folders/move"
import { OrganizationVisibilityDialog } from "../shared/visibility/dialog"
import { CreateTableDialog } from "./create"
import { EditTableDialog } from "./edit"
import { ImportTableDialog } from "./import/dialog"
import { type TablesPageState, toMoveTarget } from "./page"

/** The selection bar and the page's dialogs — everything that floats over
 *  the list. */
export function TablesOverlays({
  organizationId,
  page,
}: {
  organizationId: string
  page: TablesPageState
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
      <CreateTableDialog
        isOpen={page.dialog === "create"}
        onOpenChange={(open) => page.setDialog(open ? "create" : undefined)}
        organizationId={organizationId}
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

/** What a row's Edit details and Sharing… open, hosted once for the list. */
export function TableRowDialogs({
  organizationId,
  page,
}: {
  organizationId: string
  page: TablesPageState
}) {
  return (
    <>
      <EditTableDialog
        onOpenChange={(open) => {
          if (!open) {
            page.setEditing(undefined)
          }
        }}
        organizationId={organizationId}
        table={page.editing}
      />
      {page.sharing === undefined ? null : (
        <OrganizationVisibilityDialog
          noun="table"
          onOpenChange={(open) => {
            if (!open) {
              page.setSharing(undefined)
            }
          }}
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
