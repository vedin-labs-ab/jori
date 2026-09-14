import { type LucideIcon } from "lucide-react"
import { useCallback, useState } from "react"
import { type CountedNoun } from "../count"
import { useClientPagination } from "./pagination"
import { useRowSelection } from "./selection"

// Header-embedded sorting and filtering for client-side list pages. Each
// page declares a config — sort accessors and facet dimensions — and the
// hook holds one active sort plus per-facet selections. A page declares
// what each column is worth here too.

/** What a column is worth, as the width its list needs before the column
 *  earns its place. A list drops its least telling columns rather than
 *  hiding them behind a sideways scroll, so the same table reads in a
 *  phone-sized box and in a full window. The width is the list's own —
 *  ConsoleListLayout is the `list` container — and every class is written
 *  out in full, because Tailwind reads these names as source. */
export const columnTier = {
  "2xl": "@max-2xl/list:hidden",
  "3xl": "@max-3xl/list:hidden",
  "4xl": "@max-4xl/list:hidden",
  "5xl": "@max-5xl/list:hidden",
  lg: "@max-lg/list:hidden",
  md: "@max-md/list:hidden",
  xl: "@max-xl/list:hidden",
  xs: "@max-xs/list:hidden",
} as const

export type ColumnTier = keyof typeof columnTier

export type SortDirection = "asc" | "desc"

type ListSort = { direction: SortDirection; key: string }

/** One selectable facet value. The hint disambiguates options whose
 *  labels collide — two folders named the same, say — and renders muted
 *  beside the label. */
type FacetOption = {
  hint?: string
  icon?: LucideIcon
  label: string
  value: string
}

/** One filterable dimension of a list: its menu options, how a row resolves
 *  to an option value, and the selection the page opens with — undefined
 *  selects everything. */
export type ListFacet<Row> = {
  defaults?: readonly string[]
  label: string
  options: readonly FacetOption[]
  resolve: (row: Row) => string
}

/** Per-page declaration of what the list headers can sort and filter. */
export type ListConfig<Row> = {
  facets: Record<string, ListFacet<Row>>
  sorts: Record<string, (row: Row) => string | number>
}

type FacetSelections = Record<string, readonly string[] | undefined>

/** The header components' view of a page's control state. */
export type ListControls = {
  getFacet: (key: string) => readonly string[] | undefined
  hasActiveControls: boolean
  isFacetActive: (key: string) => boolean
  setFacet: (key: string, values: readonly string[] | undefined) => void
  sort: ListSort | undefined
  toggleSort: (key: string) => void
}

export function useListControls<Row>(
  config: ListConfig<Row>
): ListControls & { apply: (rows: readonly Row[]) => Row[] } {
  const [sort, setSort] = useState<ListSort>()
  const [selections, setSelections] = useState<FacetSelections>(() =>
    facetDefaults(config.facets)
  )
  const toggleSort = useCallback(
    (key: string) => setSort((current) => nextSort(current, key)),
    []
  )
  const setFacet = useCallback(
    (key: string, values: readonly string[] | undefined) =>
      setSelections((current) => ({ ...current, [key]: values })),
    []
  )
  const isFacetActive = (key: string) =>
    !sameSelection(selections[key], config.facets[key]?.defaults)

  return {
    apply: (rows) => applyControls(rows, config, { selections, sort }),
    getFacet: (key) => selections[key],
    hasActiveControls:
      sort !== undefined || Object.keys(config.facets).some(isFacetActive),
    isFacetActive,
    setFacet,
    sort,
    toggleSort,
  }
}

/** Filters and sorts before paging; selection follows the visible page.
 *  Header changes reset pagination, just like the caller's search controls. */
export function useListState<Row>({
  config,
  hasFilters,
  identify,
  isReady,
  noun,
  rows,
  totalCount,
  disabled,
}: {
  config: ListConfig<Row>
  hasFilters?: boolean
  identify: (row: Row) => string
  isReady: boolean
  noun: CountedNoun
  rows: Row[]
  totalCount?: number
  disabled?: (row: Row) => boolean
}) {
  const controls = useListControls(config)
  const filtered = hasFilters === true || controls.hasActiveControls
  const pagination = useClientPagination({
    hasFilters: filtered,
    isReady,
    itemLabel: noun,
    items: controls.apply(rows),
    totalCount,
  })
  const selection = useRowSelection({
    identify,
    rows: pagination.visibleRows,
    disabled,
  })

  return {
    config,
    controls: resettingControls(controls, pagination.reset),
    hasFilters: filtered,
    pagination,
    selection,
  }
}

/** Wraps controls so every change also resets the page's pagination. */
export function resettingControls(
  controls: ListControls,
  reset: () => void
): ListControls {
  return {
    ...controls,
    setFacet: (key, values) => {
      controls.setFacet(key, values)
      reset()
    },
    toggleSort: (key) => {
      controls.toggleSort(key)
      reset()
    },
  }
}

/** Sorts and filters rows by the given control state: facet selections
 *  narrow first, then the active sort orders. Without an active sort the
 *  input order is preserved. */
export function applyControls<Row>(
  rows: readonly Row[],
  config: ListConfig<Row>,
  state: { selections: FacetSelections; sort: ListSort | undefined }
): Row[] {
  const filtered = rows.filter((row) =>
    Object.entries(config.facets).every(([key, facet]) => {
      const selection = state.selections[key]

      return selection === undefined || selection.includes(facet.resolve(row))
    })
  )
  const accessor =
    state.sort === undefined ? undefined : config.sorts[state.sort.key]

  if (state.sort === undefined || accessor === undefined) {
    return filtered
  }

  const direction = state.sort.direction === "asc" ? 1 : -1

  return filtered.sort(
    (left, right) => direction * compareValues(accessor(left), accessor(right))
  )
}

/** Strings compare by locale, everything else numerically. */
function compareValues(left: string | number, right: string | number) {
  if (typeof left === "string" || typeof right === "string") {
    return String(left).localeCompare(String(right))
  }

  return left - right
}

/** asc → desc → off per key; sorting a new key starts ascending. */
export function nextSort(
  current: ListSort | undefined,
  key: string
): ListSort | undefined {
  if (current?.key !== key) {
    return { direction: "asc", key }
  }

  return current.direction === "asc" ? { direction: "desc", key } : undefined
}

/** Checkbox toggle inside a facet menu: selecting every option resets the
 *  facet to undefined — everything — instead of listing all of them. */
export function toggledFacet(
  selection: readonly string[],
  value: string,
  options: readonly FacetOption[]
): readonly string[] | undefined {
  const next = selection.includes(value)
    ? selection.filter((selected) => selected !== value)
    : [...selection, value]

  return next.length === options.length ? undefined : next
}

/** The concrete selection a facet menu shows: an undefined selection means
 *  every option is checked. */
export function facetSelection(
  controls: ListControls,
  key: string,
  options: readonly FacetOption[]
) {
  return controls.getFacet(key) ?? options.map((option) => option.value)
}

/** A facet as the header components render it: its key plus menu content. */
export type FacetEntry = {
  key: string
  label: string
  options: readonly FacetOption[]
}

/** Picks facets off a page config in the order a header menu lists them. */
export function facetEntries<Row>(
  config: ListConfig<Row>,
  keys: readonly string[]
): FacetEntry[] {
  return keys.flatMap((key) => {
    const facet = config.facets[key]

    return facet === undefined
      ? []
      : [{ key, label: facet.label, options: facet.options }]
  })
}

function facetDefaults(
  facets: Record<string, { defaults?: readonly string[] }>
): FacetSelections {
  return Object.fromEntries(
    Object.entries(facets).map(([key, facet]) => [key, facet.defaults])
  )
}

function sameSelection(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined
) {
  if (left === undefined || right === undefined) {
    return left === right
  }

  return (
    left.length === right.length && left.every((value) => right.includes(value))
  )
}
