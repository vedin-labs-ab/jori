import { useCallback, useContext, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConsolePageLayout } from "@/shared/console/layout"
import { MaterialTitleMenu } from "@/shared/console/materials/actions/menu"
import {
  type MaterialBreadcrumb,
  useMaterialTrail,
} from "@/shared/console/materials/breadcrumb"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { tableDeleteDescription } from "@/shared/console/tables/list/config"
import { type TableDetail, type TableRow } from "@/shared/console/tables/types"
import { folderOf, folderTrail } from "../derive/folders"
import { materialOf, tableDetail, tableRows } from "../derive/materials"
import { MaterialDialogs, type MaterialRequest } from "../dialogs/materials"
import { type DemoState } from "../state/types"
import { useDemoWorkspace } from "../workspace"
import { TableGrid } from "./grid"

/** One table's page over the workspace: the grid, under the crumb and
 *  title menu the console gives a table. */
export function TablePage({ tableId }: { tableId: string }) {
  const { state } = useDemoWorkspace()
  const table = useMemo(() => tableDetail(state, tableId), [state, tableId])
  const rows = useMemo(() => tableRows(state, tableId), [state, tableId])

  if (table === undefined) {
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

  return <TableDetailPage rows={rows} table={table} />
}

function TableDetailPage({
  rows,
  table,
}: {
  rows: TableRow[]
  table: TableDetail
}) {
  const { state } = useDemoWorkspace()
  const [request, setRequest] = useState<MaterialRequest>()
  const onRequest = useCallback(
    (kind: MaterialRequest["kind"]) => {
      const material = materialOf(state, table.tableId)

      if (material !== undefined) {
        setRequest({ kind, material })
      }
    },
    [state, table.tableId]
  )

  useTableTrail(table, onRequest)

  return (
    <>
      <TableGrid rows={rows} table={table} />
      <MaterialDialogs
        onClose={() => setRequest(undefined)}
        request={request}
      />
    </>
  )
}

/** The table's crumb and title menu, published to the frame's header. */
function useTableTrail(
  table: TableDetail,
  onRequest: (kind: MaterialRequest["kind"]) => void
) {
  const { actions, state } = useDemoWorkspace()
  const navigation = useContext(ConsoleNavigationContext)

  useMaterialTrail(
    useMemo(
      () => ({
        ...tableCrumb(state, table),
        menu: (
          <MaterialTitleMenu
            deleteDescription={tableDeleteDescription}
            isDeleting={false}
            isRestoring={false}
            material={{ name: table.name, archivedAt: undefined }}
            noun="table"
            onAccess={() => onRequest("access")}
            onDelete={() => {
              actions.removeMaterial(table.tableId)
              navigation?.navigate("/tables")
            }}
            onEdit={() => onRequest("edit")}
            onMoveToFolder={() => onRequest("move")}
            onRestore={() => undefined}
          />
        ),
      }),
      [actions, navigation, onRequest, state, table]
    )
  )
}

/** The table's crumb: its folder's own trail when it is filed, so the page
 *  says where the table lives, and the surface's otherwise. */
function tableCrumb(state: DemoState, table: TableDetail): MaterialBreadcrumb {
  const folder =
    table.folderId === undefined ? undefined : folderOf(state, table.folderId)

  return {
    name: table.name,
    ...(folder === undefined
      ? {}
      : {
          trail: folderTrail(state, folder).map((segment) => ({
            name: segment.name,
            params: { folderId: segment.folderId },
            to: "/folders/$folderId",
          })),
        }),
  }
}
