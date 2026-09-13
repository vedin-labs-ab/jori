import { moveTarget } from "@/shared/console/folders/types"
import { closeOnDismiss } from "@/shared/console/retain"
import { type TableDetail } from "@/shared/console/tables/types"
import { MoveResourceDialog } from "../../folders/move"
import { MaterialLinksDialog } from "../../shared/materials/links"
import { OrganizationVisibilityDialog } from "../../shared/visibility/dialog"
import { EditTableDialog } from "../edit"

export type TableDialog = "access" | "edit" | "move" | "share"

/** The page's dialogs: what its crumb's menu and header actions open,
 *  about the table itself. The grid's own overlays come with the grid. */
export function TableDialogs({
  dialog,
  onClose,
  organizationId,
  table,
}: {
  dialog: TableDialog | undefined
  onClose: () => void
  organizationId: string
  table: TableDetail
}) {
  const closeWhenDismissed = closeOnDismiss(onClose)

  return (
    <>
      <EditTableDialog
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
        table={dialog === "edit" ? table : undefined}
      />
      <OrganizationVisibilityDialog
        noun="table"
        onOpenChange={closeWhenDismissed}
        open={dialog === "access"}
        organizationId={organizationId}
        ownerId={table.ownerId}
        target={{ kind: "table", id: table.tableId }}
        value={table.visibility}
      />
      <MaterialLinksDialog
        onOpenChange={closeWhenDismissed}
        open={dialog === "share"}
        organizationId={organizationId}
        target={{ kind: "table", id: table.tableId }}
      />
      <MoveResourceDialog
        onClose={onClose}
        organizationId={organizationId}
        resource={
          dialog === "move"
            ? moveTarget("collection", table.tableId, table)
            : undefined
        }
      />
    </>
  )
}
