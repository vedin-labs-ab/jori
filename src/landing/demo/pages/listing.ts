import { useState } from "react"
import { type CountedNoun } from "@/shared/console/count"
import {
  type ListConfig,
  resettingControls,
  useListControls,
} from "@/shared/console/list/controls"
import {
  useClientPagination,
  useResettingSetter,
} from "@/shared/console/list/pagination"
import { useRowSelection } from "@/shared/console/list/selection"

/** What every material list page keeps: the header's sorts and facets, a
 *  search over names, the pager, and a selection over the visible rows. */
export function useMaterialListing<Row extends { name: string }>({
  config,
  identify,
  noun,
  rows,
}: {
  config: ListConfig<Row>
  identify: (row: Row) => string
  noun: CountedNoun
  rows: Row[]
}) {
  const [query, setQuery] = useState("")
  const controls = useListControls(config)
  const needle = query.trim().toLowerCase()
  const listed = controls
    .apply(rows)
    .filter((row) => needle === "" || row.name.toLowerCase().includes(needle))
  const hasFilters = needle !== "" || controls.hasActiveControls
  const pagination = useClientPagination({
    hasFilters,
    isReady: true,
    itemLabel: noun,
    items: listed,
  })
  const selection = useRowSelection({ identify, rows: pagination.visibleRows })

  return {
    controls: resettingControls(controls, pagination.reset),
    hasFilters,
    pagination,
    query,
    selection,
    setQuery: useResettingSetter(setQuery, pagination.reset),
  }
}
