import { useState } from "react"

/** Row selection over the currently visible rows of a list page. Ids are
 *  matched against the rows on every render, so rows that disappear —
 *  deleted, filtered away, or paged out — drop out of the selection on
 *  their own. */
export type RowSelection<Row> = {
  clear: () => void
  count: number
  isSelected: (row: Row) => boolean
  selected: Row[]
  toggle: (row: Row) => void
  toggleAll: () => void
  allSelected: boolean
}

export function useRowSelection<Row>({
  identify,
  rows,
}: {
  identify: (row: Row) => string
  rows: Row[]
}): RowSelection<Row> {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())
  const selected = rows.filter((row) => ids.has(identify(row)))
  const allSelected = rows.length > 0 && selected.length === rows.length

  return {
    allSelected,
    clear: () => setIds(new Set()),
    count: selected.length,
    isSelected: (row) => ids.has(identify(row)),
    selected,
    toggle: (row) => setIds(withToggled(ids, identify(row))),
    toggleAll: () =>
      setIds(allSelected ? new Set() : new Set(rows.map(identify))),
  }
}

function withToggled(ids: ReadonlySet<string>, id: string) {
  const next = new Set(ids)

  if (!next.delete(id)) {
    next.add(id)
  }

  return next
}
