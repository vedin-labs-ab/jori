import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { type TableDetail } from "@/shared/console/tables/types"
import { api } from "../../../../convex/_generated/api"
import { useTableGrid } from "../../tables/detail/grid"

/** A table in the pane: the same grid its page mounts, over the same
 *  row pages and writes. A table the viewer cannot open shows nothing;
 *  the pane's header already says it is unavailable. */
export function PaneTable({
  id,
  organizationId,
}: {
  id: string
  organizationId: string
}) {
  const result = useQuery(api.tables.console.get, {
    organizationId,
    tableId: id as GenericId<"collections">,
  })

  if (result === undefined) {
    return <ConsoleListLoading />
  }

  if (result.status !== "ready" || result.table === null) {
    return null
  }

  return <PaneGrid organizationId={organizationId} table={result.table} />
}

function PaneGrid({
  organizationId,
  table,
}: {
  organizationId: string
  table: TableDetail
}) {
  const grid = useTableGrid(organizationId, table)

  return (
    <ChatPaneBody
      material={{
        kind: "table",
        grid: grid.props,
        overlays: grid.overlays,
        rowCount: table.rowCount,
      }}
    />
  )
}
