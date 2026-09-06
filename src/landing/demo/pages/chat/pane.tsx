import { lazy, Suspense, useMemo } from "react"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { type ReferenceTarget } from "@/shared/console/chat/types"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { type TableDetail, type TableRow } from "@/shared/console/tables/types"
import { tableDetail, tableRows } from "../../derive/materials"
import { useDemoWorkspace } from "../../workspace"
import { useDemoGrid } from "../materials/rows"

// A job's overview carries the brief's markdown codec, so it arrives with
// the job's page module, the way the router loads it.
const JobPaneBody = lazy(async () => ({
  default: (await import("../jobs/detail")).JobPaneBody,
}))

/** What a reply's target shows in the pane beside the chat: the console's
 *  grid for a table, its overview for a job, over the workspace the way
 *  their pages are. Anything else opens on its own page. */
export function DemoPaneBody({ target }: { target: ReferenceTarget }) {
  switch (target.kind) {
    case "table":
      return <DemoPaneTable tableId={target.id} />
    case "job":
      return (
        <Suspense fallback={<ConsoleListLoading />}>
          <JobPaneBody jobId={target.id} />
        </Suspense>
      )
    default:
      return null
  }
}

function DemoPaneTable({ tableId }: { tableId: string }) {
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
