import { useMemo } from "react"
import { materialOf, tableDetail, tableRows } from "../../derive/materials"
import { useDemoWorkspace } from "../../workspace"
import { CollectionTitle, MaterialMissing } from "./chrome"
import { TableGrid } from "./grid"

/** One table's page over the workspace: the grid, under the crumb and
 *  title menu the console gives a table. */
export function TablePage({ tableId }: { tableId: string }) {
  const { state } = useDemoWorkspace()
  const material = materialOf(state, tableId)
  const table = useMemo(() => tableDetail(state, tableId), [state, tableId])
  const rows = useMemo(() => tableRows(state, tableId), [state, tableId])

  if (table === undefined || material?.kind !== "table") {
    return <MaterialMissing noun="table" />
  }

  return (
    <>
      <TableGrid rows={rows} table={table} />
      <CollectionTitle material={material} table={table} />
    </>
  )
}
