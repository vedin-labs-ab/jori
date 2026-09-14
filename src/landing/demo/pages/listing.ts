import { useState } from "react"
import { type CountedNoun } from "@/shared/console/count"
import { useEditing } from "@/shared/console/edit/state"
import { type ListConfig, useListState } from "@/shared/console/list/controls"
import { useResettingSetter } from "@/shared/console/list/pagination"

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
  const needle = query.trim().toLowerCase()
  const edit = useEditing()?.edit
  const listing = useListState({
    disabled: (row) => identify(row) === edit?.item.id,
    config,
    hasFilters: needle !== "",
    identify,
    isReady: true,
    noun,
    rows: rows.filter(
      (row) => needle === "" || row.name.toLowerCase().includes(needle)
    ),
  })

  return {
    ...listing,
    query,
    setQuery: useResettingSetter(setQuery, listing.pagination.reset),
  }
}
