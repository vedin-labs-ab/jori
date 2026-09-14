import { useMemo } from "react"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { type TableDetail, type TableRow } from "@/shared/console/tables/types"
import { tableDetail, tableRows } from "../../../derive/materials"
import { useDemoWorkspace } from "../../../workspace"
import { useDemoGrid } from "../../materials/rows"

/** The table's grid out of the workspace, over the same rows and
 *  dialogs its page mounts. */
export function DemoPaneTable({ tableId }: { tableId: string }) {
  const { state } = useDemoWorkspace()
  const table = useMemo(() => tableDetail(state, tableId), [state, tableId])
  const rows = useMemo(() => tableRows(state, tableId), [state, tableId])

  return table === undefined ? null : <DemoPaneGrid rows={rows} table={table} />
}

function DemoPaneGrid({
  rows,
  table,
}: {
  rows: TableRow[]
  table: TableDetail
}) {
  const grid = useDemoGrid(table, rows)
  useMaterialBreadcrumb(table.name)

  return (
    <ChatPaneBody
      material={{
        kind: "table",
        grid: grid.props,
        overlays: grid.overlays,
        rowCount: rows.length,
      }}
    />
  )
}
