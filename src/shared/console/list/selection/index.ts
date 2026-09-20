import { type RefObject, useEffect, useRef, useState } from "react"

/** Row selection over the currently visible rows of a list page. Ids are
 *  matched against the rows on every render, so rows that disappear —
 *  deleted, filtered away, or paged out — drop out of the selection on
 *  their own. */
export type RowSelection<Row> = {
  clear: () => void
  count: number
  /** The id a row answers to, here and on its element's `data-row-id`. */
  identify: (row: Row) => string
  isSelected: (row: Row) => boolean
  /** A pointer's pick, as a file manager reads it: the row alone, toggled
   *  into the selection, or the run from the last pick through this row. */
  pick: (row: Row, how?: "alone" | "toggle" | "range") => void
  /** Swaps the whole selection, as a marquee does while it sweeps. */
  replace: (ids: Iterable<string>) => void
  selected: Row[]
  toggle: (row: Row) => void
  toggleAll: () => void
  allSelected: boolean
}

export function useRowSelection<Row>({
  identify,
  rows,
  disabled,
}: {
  identify: (row: Row) => string
  rows: Row[]
  disabled?: (row: Row) => boolean
}): RowSelection<Row> {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())
  // Where a Shift-pick's run starts: the last row picked without Shift.
  const anchor = useRef<string | undefined>(undefined)
  rows = rows.filter((row) => !disabled?.(row))
  const selected = rows.filter((row) => ids.has(identify(row)))
  const allSelected = rows.length > 0 && selected.length === rows.length

  const pick: RowSelection<Row>["pick"] = (row, how = "alone") => {
    if (disabled?.(row)) {
      return
    }

    const id = identify(row)

    if (how === "range") {
      setIds(new Set(runBetween(rows.map(identify), anchor.current, id)))
      return
    }

    anchor.current = id
    setIds(how === "toggle" ? withToggled(ids, id) : new Set([id]))
  }

  return {
    allSelected,
    clear: () => setIds(new Set()),
    count: selected.length,
    identify,
    isSelected: (row) => !disabled?.(row) && ids.has(identify(row)),
    pick,
    replace: (next) => setIds(new Set(next)),
    selected,
    toggle: (row) => pick(row, "toggle"),
    toggleAll: () =>
      setIds(allSelected ? new Set() : new Set(rows.map(identify))),
  }
}

/** The ids from the anchor through the target, in list order; the target
 *  alone when the anchor is gone from the list. */
function runBetween(ids: string[], anchor: string | undefined, target: string) {
  const from = anchor === undefined ? -1 : ids.indexOf(anchor)
  const to = ids.indexOf(target)

  return from === -1
    ? [target]
    : ids.slice(Math.min(from, to), Math.max(from, to) + 1)
}

function withToggled(ids: ReadonlySet<string>, id: string) {
  const next = new Set(ids)

  if (!next.delete(id)) {
    next.add(id)
  }

  return next
}

/** The keys a list answers while focus is inside it, where a click on a
 *  row puts it: Escape lets go of the selection and ⌘/Ctrl+A takes every
 *  row. A field inside the list, such as a name being typed, keeps its
 *  own keys. */
export function useSelectionKeys<Row>(
  list: RefObject<HTMLElement | null>,
  selection: RowSelection<Row> | undefined
) {
  const latest = useRef(selection)

  useEffect(() => {
    latest.current = selection
  })
  useEffect(() => {
    const element = list.current
    const onKeyDown = (event: KeyboardEvent) =>
      latest.current ? selectionKeyDown(event, latest.current) : undefined

    element?.addEventListener("keydown", onKeyDown)

    return () => element?.removeEventListener("keydown", onKeyDown)
  }, [list])
}

function selectionKeyDown<Row>(
  event: KeyboardEvent,
  selection: RowSelection<Row>
) {
  if (
    event.target instanceof Element &&
    event.target.closest("input,textarea,select,[contenteditable]") !== null
  ) {
    return
  }

  if (event.key === "Escape" && selection.count > 0) {
    selection.clear()
  } else if (event.key === "a" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()

    if (!selection.allSelected) {
      selection.toggleAll()
    }
  }
}

/** The select-all checkbox's tri-state for a selection: all, some
 *  (indeterminate), or none. */
export function selectionHeadState<Row>(
  selection: RowSelection<Row>
): boolean | "indeterminate" {
  if (selection.allSelected) {
    return true
  }

  return selection.count > 0 ? ("indeterminate" as const) : false
}
