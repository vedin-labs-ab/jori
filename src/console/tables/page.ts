import { useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { useFolderNames } from "@/console/shared/materials/names"
import { type MoveResourceTarget } from "@/shared/console/folders/types"
import {
  resettingControls,
  useListControls,
} from "@/shared/console/list/controls"
import {
  useClientPagination,
  useResettingSetter,
} from "@/shared/console/list/pagination"
import { useRowSelection } from "@/shared/console/list/selection"
import { type TableSummary } from "@/shared/console/tables/types"
import { api } from "../../../convex/_generated/api"
import {
  tableListConfig,
  tableNoun,
  useTableBulk,
  useTableRemoval,
} from "./manage"

export type TablesPageState = ReturnType<typeof useTablesPage>

/** One bag of page state, so the view and its overlays stay small. */
export function useTablesPage(organizationId: string) {
  const [query, setQuery] = useState("")
  const [dialog, setDialog] = useState<"create" | "import">()
  const [editing, setEditing] = useState<TableSummary>()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const [sharing, setSharing] = useState<TableSummary>()
  const removal = useTableRemoval(organizationId)
  const folders = useFolderNames(organizationId)
  const deferredQuery = useDeferredValue(query)
  const tableList = useQuery(api.tables.console.list, {
    organizationId,
    query: deferredQuery,
    includeArchived: false,
  })
  const rows = tableList?.status === "ready" ? tableList.tables : []
  const config = tableListConfig(folders, rows)
  const controls = useListControls(config)
  const tables = controls.apply(rows)
  const hasFilters = query.trim() !== "" || controls.hasActiveControls
  const pagination = useClientPagination({
    hasFilters,
    isReady: tableList?.status === "ready",
    itemLabel: tableNoun,
    items: tables,
  })
  const selection = useRowSelection({
    identify: (table: TableSummary) => table.tableId,
    rows: pagination.visibleRows,
  })

  return {
    bulk: useTableBulk(organizationId, selection),
    config,
    controls: resettingControls(controls, pagination.reset),
    dialog,
    editing,
    folders,
    hasFilters,
    moving,
    pagination,
    query,
    removal,
    selection,
    setDialog,
    setEditing,
    setMoving,
    setSharing,
    sharing,
    setQueryAndReset: useResettingSetter(setQuery, pagination.reset),
    tableList,
  }
}

export function toMoveTarget(table: TableSummary): MoveResourceTarget {
  return {
    resourceType: "collection",
    resourceId: table.tableId,
    name: table.name,
    folderId: table.folderId,
  }
}
