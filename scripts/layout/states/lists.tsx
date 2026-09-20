import { useEffect, useMemo, useState } from "react"
import { folderNames } from "@/landing/demo/derive/folders"
import { tableSummaries } from "@/landing/demo/derive/materials"
import { demoId } from "@/landing/demo/fixtures/ids"
import { useMaterialListing } from "@/landing/demo/pages/listing"
import { useDemoWorkspace } from "@/landing/demo/workspace"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { ConsoleListBody } from "@/shared/console/list/pager"
import { bulkMaterialRemoval } from "@/shared/console/materials/removal"
import { TableList, TablesToolbar } from "@/shared/console/tables/list"
import {
  tableDeleteDescription,
  tableListConfig,
  tableNoun,
} from "@/shared/console/tables/list/config"
import { type TableSummary } from "@/shared/console/tables/types"
import { useLifecycle } from "./lifecycle"

const ignore = () => undefined

function useRows(state: string) {
  const workspace = useDemoWorkspace()
  const initial = useMemo(() => {
    const tables = tableSummaries(workspace.state)
    return Array.from({ length: 29 }, (_, index) => ({
      ...tables[index % tables.length],
      tableId: demoId("collections", `layout-${index}`),
      archivedAt: index === 0 && state.startsWith("archived-") ? 1 : undefined,
      name: `${String(index + 1).padStart(2, "0")} ${tables[index % tables.length].name} for the regional customer operations team`,
    }))
  }, [state, workspace.state])
  const [rows, setRows] = useState<TableSummary[]>(initial)
  const [loading, setLoading] = useState(state.startsWith("load-"))
  useEffect(() => {
    if (!state.startsWith("load-")) {
      return
    }
    const timer = setTimeout(() => {
      if (state !== "load-ready") {
        setRows([])
      }
      setLoading(false)
    }, 1100)
    return () => clearTimeout(timer)
  }, [state])
  return { rows, setRows, loading, folders: folderNames(workspace.state) }
}

function useListState(state: string) {
  const data = useRows(state)
  const listing = useMaterialListing({
    config: tableListConfig(data.folders, data.rows),
    identify: (table) => table.tableId,
    noun: tableNoun,
    rows: data.rows,
  })
  const [loadingMore, setLoadingMore] = useState(false)
  useEffect(() => {
    // A test-only key represents an independent subscription update.
    const receive = (event: KeyboardEvent) => {
      if (event.key !== "F8") {
        return
      }
      setTimeout(() => data.setRows((rows) => rows.slice(1)), 1100)
    }
    window.addEventListener("keydown", receive)
    return () => window.removeEventListener("keydown", receive)
  }, [data.setRows])
  const pagination = {
    ...listing.pagination,
    isLoadingMore: loadingMore,
    next: () => {
      setLoadingMore(true)
      setTimeout(() => {
        listing.pagination.next()
        setLoadingMore(false)
      }, 1100)
    },
  }
  return { data, listing, pagination }
}

export function ListStates({ state }: { state: string }) {
  const { data, listing, pagination } = useListState(state)
  const removal = useLifecycle(state, data.setRows)
  const unauthorized = state === "load-unauthorized" && !data.loading
  return (
    <ConsoleListLayout>
      <TablesToolbar
        onCreate={ignore}
        onImport={ignore}
        onQueryChange={listing.setQuery}
        query={listing.query}
      />
      <ConsoleListBody
        isLoading={data.loading}
        pagination={unauthorized ? undefined : pagination}
      >
        <TableList
          config={listing.config}
          controls={listing.controls}
          folders={data.folders}
          hasFilters={listing.hasFilters}
          onAccess={ignore}
          onCreate={ignore}
          onImport={ignore}
          onMoveToFolder={ignore}
          removal={removal}
          selection={listing.selection}
          selectionActions={{
            isBusy: false,
            noun: tableNoun,
            onRemove: ignore,
            removal: bulkMaterialRemoval(
              listing.selection.selected,
              tableNoun,
              tableDeleteDescription
            ),
          }}
          tables={listing.pagination.visibleRows}
          unauthorizedMessage={
            unauthorized ? "You do not have access to these tables." : undefined
          }
        />
      </ConsoleListBody>
    </ConsoleListLayout>
  )
}
