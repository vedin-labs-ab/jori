import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  ListChecks,
} from "lucide-react"
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
// ghost button — the cell itself is not the control, and the button stays
// inside the cell's own padding so it never crowds its neighbors.

// An active sort or filter keeps the ghost hover background, so what is
// shaping the list stays marked after the pointer leaves.
const activeClassName = "bg-muted text-foreground dark:bg-muted/50"

function isFiltering(controls: ListControls, facets: FacetEntry[]) {
  return facets.some((facet) => controls.isFacetActive(facet.key))
}

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
      <div className="flex items-center gap-0.5">
        <Button
          className={cn(
            "font-medium",
            direction !== undefined && activeClassName
          )}
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
              className={cn(
                "px-1.5",
                isFiltering(controls, facets) && activeClassName
              )}
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
      <div className="flex items-center">
        <FacetMenu controls={controls} facets={facets}>
          <Button
            className={cn(
              "font-medium",
              isFiltering(controls, facets) && activeClassName
            )}
            type="button"
            variant="ghost"
          >
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
        <span className="text-[0.625rem] text-muted-foreground tabular-nums">
          {count}
        </span>
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
          {/* The reset rides beside the search rather than posing as an
              option; it only enables while narrowing is actually on. */}
          <div className="flex items-end gap-1 pr-1">
            <div className="min-w-0 flex-1">
              <CommandInput placeholder="Search…" />
            </div>
            <Button
              className="mt-1 h-8"
              disabled={!isFiltering(controls, facets)}
              onClick={() => {
                for (const facet of facets) {
                  controls.setFacet(facet.key, undefined)
                }
              }}
              type="button"
              variant="outline"
            >
              <ListChecks />
              All
            </Button>
          </div>
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

/** One labeled facet inside the menu: its options, each carrying its icon
 *  and a trailing check when selected. The list searches and scrolls
 *  through the Command primitives, so a hundred options stay usable. */
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
