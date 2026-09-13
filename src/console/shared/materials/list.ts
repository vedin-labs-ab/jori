import { useQuery } from "convex/react"
import { type FunctionReference } from "convex/server"
import { useDeferredValue, useState } from "react"
import { type CountedNoun } from "@/shared/console/count"
import { type MoveResourceTarget } from "@/shared/console/folders/types"
import { type ListConfig, useListState } from "@/shared/console/list/controls"
import { useResettingSetter } from "@/shared/console/list/pagination"
import { type FolderNames } from "@/shared/console/materials/folders"
import { useFolderNames } from "./names"

type ListQuery<Result> = FunctionReference<
  "query",
  "public",
  { organizationId: string; query: string; includeArchived: boolean },
  Result
>

/** One bag of page state for a searchable material list — the query, the
 *  header controls, the client-side page, the row selection, and the rows
 *  a menu has opened a dialog for — so the view and its overlays stay
 *  small. Tables and stores are the same page over different rows. */
export function useMaterialListPage<Row, Result extends { status: string }>({
  config,
  identify,
  listQuery,
  noun,
  organizationId,
  rowsOf,
}: {
  config: (folders: FolderNames | undefined, rows: Row[]) => ListConfig<Row>
  identify: (row: Row) => string
  listQuery: ListQuery<Result>
  noun: CountedNoun
  organizationId: string
  /** The listed rows, or none while the result is anything but ready. */
  rowsOf: (result: Result) => Row[]
}) {
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Row>()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const [sharing, setSharing] = useState<Row>()
  const folders = useFolderNames(organizationId)
  const deferredQuery = useDeferredValue(query)
  const list = useQuery(listQuery, {
    organizationId,
    query: deferredQuery,
    includeArchived: false,
  })
  const rows = list === undefined ? [] : rowsOf(list)
  const listing = useListState({
    config: config(folders, rows),
    hasFilters: query.trim() !== "",
    identify,
    isReady: list?.status === "ready",
    noun,
    rows,
  })

  return {
    ...listing,
    editing,
    folders,
    list,
    moving,
    query,
    setEditing,
    setMoving,
    setQueryAndReset: useResettingSetter(setQuery, listing.pagination.reset),
    setSharing,
    sharing,
  }
}
