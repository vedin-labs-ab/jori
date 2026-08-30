import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  type FacetEntry,
  facetSelection,
  type ListControls,
  type SortDirection,
  toggledFacet,
} from "./controls"

// Header-embedded list controls: every control is a compact ghost button
// living inside the header cell itself — no toolbar rows.

const headButtonClassName =
  "h-10 justify-start gap-1.5 rounded-none px-2 font-medium text-sm"

/** Sortable header: the label is the button and clicking cycles the sort.
 *  A column that also filters renders a trailing facet menu icon-button. */
export function SortHead({
  controls,
  facets,
  label,
  sortKey,
}: {
  controls: ListControls
  facets?: FacetEntry[]
  label: string
  sortKey: string
}) {
  const direction =
    controls.sort?.key === sortKey ? controls.sort.direction : undefined

  return (
    <TableHead aria-sort={ariaSort(direction)} className="p-0">
      <div className="flex items-center">
        <Button
          className={headButtonClassName}
          onClick={() => controls.toggleSort(sortKey)}
          type="button"
          variant="ghost"
        >
          {label}
          <SortIcon direction={direction} />
        </Button>
        {facets === undefined ? null : (
          <FacetMenu controls={controls} facets={facets}>
            <Button
              aria-label={`Filter by ${facetLabels(facets)}`}
              className="h-10 gap-1 rounded-none px-1.5"
              type="button"
              variant="ghost"
            >
              <FilterMark controls={controls} facets={facets} />
            </Button>
          </FacetMenu>
        )}
      </div>
    </TableHead>
  )
}

/** Filter-only header: the label itself opens the facet menu. */
export function FilterHead({
  controls,
  facets,
  label,
}: {
  controls: ListControls
  facets: FacetEntry[]
  label: string
}) {
  return (
    <TableHead className="p-0">
      <FacetMenu controls={controls} facets={facets}>
        <Button className={headButtonClassName} type="button" variant="ghost">
          {label}
          <FilterMark controls={controls} facets={facets} />
        </Button>
      </FacetMenu>
    </TableHead>
  )
}

function SortIcon({ direction }: { direction: SortDirection | undefined }) {
  const Icon =
    direction === undefined
      ? ArrowUpDown
      : direction === "asc"
        ? ArrowUp
        : ArrowDown

  return (
    <Icon
      className={cn(
        "size-3.5",
        direction === undefined ? "text-muted-foreground" : "text-foreground"
      )}
    />
  )
}

/** Filter icon plus the count of selected values across active facets. */
function FilterMark({
  controls,
  facets,
}: {
  controls: ListControls
  facets: FacetEntry[]
}) {
  const isActive = facets.some((facet) => controls.isFacetActive(facet.key))
  const count = facets.reduce((total, facet) => {
    const selection = controls.getFacet(facet.key)

    return controls.isFacetActive(facet.key) && selection !== undefined
      ? total + selection.length
      : total
  }, 0)

  return (
    <>
      <Filter
        className={cn(
          "size-3.5",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      />
      {isActive && count > 0 ? (
        <span className="text-foreground tabular-nums">{count}</span>
      ) : null}
    </>
  )
}

function FacetMenu({
  children,
  controls,
  facets,
}: {
  children: ReactNode
  controls: ListControls
  facets: FacetEntry[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {facets.map((facet, index) => (
          <FacetSection
            controls={controls}
            facet={facet}
            key={facet.key}
            withSeparator={index > 0}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** One labeled facet inside the menu: an All reset above its checkboxes. */
function FacetSection({
  controls,
  facet,
  withSeparator,
}: {
  controls: ListControls
  facet: FacetEntry
  withSeparator: boolean
}) {
  const selection = facetSelection(controls, facet.key, facet.options)

  return (
    <>
      {withSeparator ? <DropdownMenuSeparator /> : null}
      <DropdownMenuLabel>{facet.label}</DropdownMenuLabel>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault()
          controls.setFacet(facet.key, undefined)
        }}
      >
        All
      </DropdownMenuItem>
      {facet.options.map((option) => (
        <DropdownMenuCheckboxItem
          checked={selection.includes(option.value)}
          key={option.value}
          onCheckedChange={() =>
            controls.setFacet(
              facet.key,
              toggledFacet(selection, option.value, facet.options)
            )
          }
          onSelect={(event) => event.preventDefault()}
        >
          {option.label}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  )
}

function ariaSort(direction: SortDirection | undefined) {
  if (direction === undefined) {
    return undefined
  }

  return direction === "asc" ? ("ascending" as const) : ("descending" as const)
}

function facetLabels(facets: FacetEntry[]) {
  return facets.map((facet) => facet.label.toLowerCase()).join(" and ")
}
