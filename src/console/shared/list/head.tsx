import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  type FacetEntry,
  facetSelection,
  type ListControls,
  type SortDirection,
  toggledFacet,
} from "./controls"

// Header-embedded list controls: each header cell houses a small stock
// ghost button — the cell itself is not the control. The negative margin
// keeps the button's label on the table's text grid.

/** Sortable header: the label is the button and clicking cycles the sort.
 *  A column that also filters renders a trailing facet menu button. */
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
    <TableHead aria-sort={ariaSort(direction)}>
      <div className="-ml-2 flex items-center gap-0.5">
        <Button
          className="font-medium"
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
              className="px-1.5"
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
    <TableHead>
      <div className="-ml-2 flex items-center">
        <FacetMenu controls={controls} facets={facets}>
          <Button className="font-medium" type="button" variant="ghost">
            {label}
            <FilterMark controls={controls} facets={facets} />
          </Button>
        </FacetMenu>
      </div>
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
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            {facets.map((facet) => (
              <FacetSection controls={controls} facet={facet} key={facet.key} />
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** One labeled facet inside the menu: an All reset above its options, each
 *  carrying its icon and a trailing check when selected. The list searches
 *  and scrolls through the Command primitives, so a hundred options stay
 *  usable. */
function FacetSection({
  controls,
  facet,
}: {
  controls: ListControls
  facet: FacetEntry
}) {
  const selection = facetSelection(controls, facet.key, facet.options)

  return (
    <CommandGroup heading={facet.label}>
      <CommandItem
        onSelect={() => controls.setFacet(facet.key, undefined)}
        value="All"
      >
        All
      </CommandItem>
      {facet.options.map((option) => (
        <CommandItem
          data-checked={selection.includes(option.value)}
          key={option.value}
          onSelect={() =>
            controls.setFacet(
              facet.key,
              toggledFacet(selection, option.value, facet.options)
            )
          }
          value={option.label}
        >
          {option.icon === undefined ? null : (
            <option.icon className="text-muted-foreground" />
          )}
          {option.label}
        </CommandItem>
      ))}
    </CommandGroup>
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
