import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  ListChecks,
  ListX,
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
import { scrollFade } from "@/shared/fade"
import {
  type FacetEntry,
  facetSelection,
  type ListControls,
  type SortDirection,
  toggledFacet,
} from "./controls"

// Header-embedded list controls: each header cell houses a small stock
// ghost button — the cell itself is not the control. At rest the button
// sheds its horizontal padding so the label sits exactly on the column's
// text grid; hovering, focusing, opening, or being active grows the
// padding back (the Button's own transition animates it), the same move
// the breadcrumb trigger makes.
const headButtonClassName =
  "px-0 font-medium hover:px-2 focus-visible:px-2 aria-expanded:px-2"

// An active sort or filter keeps the ghost hover background, so what is
// shaping the list stays marked after the pointer leaves.
const activeClassName = "bg-muted px-2 text-foreground dark:bg-muted/50"

function isFiltering(controls: ListControls, facets: FacetEntry[]) {
  return facets.some((facet) => controls.isFacetActive(facet.key))
}

/** Sortable header: the label is the button and clicking cycles the sort.
 *  The class a list hands in is the column's tier — head and cells carry
 *  the same one, so a column leaves whole. */
export function SortHead({
  className,
  controls,
  label,
  sortKey,
}: {
  className?: string
  controls: ListControls
  label: string
  sortKey: string
}) {
  const direction =
    controls.sort?.key === sortKey ? controls.sort.direction : undefined

  return (
    <TableHead aria-sort={ariaSort(direction)} className={className}>
      <div className="flex items-center gap-0.5">
        <Button
          className={cn(
            headButtonClassName,
            direction !== undefined && activeClassName
          )}
          onClick={() => controls.toggleSort(sortKey)}
          type="button"
          variant="ghost"
        >
          {label}
          <SortIcon direction={direction} />
        </Button>
      </div>
    </TableHead>
  )
}

/** Filter-only header: the label itself opens the facet menu. */
export function FilterHead({
  className,
  controls,
  facets,
  label,
}: {
  className?: string
  controls: ListControls
  facets: FacetEntry[]
  label: string
}) {
  return (
    <TableHead className={className}>
      <div className="flex items-center">
        <FacetMenu controls={controls} facets={facets}>
          <Button
            className={cn(
              headButtonClassName,
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

/** Search scores only the option labels: item identity comes from the
 *  facet value, which may be an opaque id that must never match text the
 *  user types. */
function facetFilter(_value: string, search: string, keywords?: string[]) {
  const haystack = (keywords ?? []).join(" ").toLowerCase()

  return haystack.includes(search.trim().toLowerCase()) ? 1 : 0
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
        <Command filter={facetFilter}>
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
          <CommandList className={scrollFade}>
            <CommandEmpty>No matches.</CommandEmpty>
            {facets.map((facet) => (
              <FacetSection controls={controls} facet={facet} key={facet.key} />
            ))}
          </CommandList>
          <ClearFooter controls={controls} facets={facets} />
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Pinned below the option list while anything is selected: one press
 *  empties the selection, so picking a single option is Clear + click
 *  instead of deselecting everything else. */
function ClearFooter({
  controls,
  facets,
}: {
  controls: ListControls
  facets: FacetEntry[]
}) {
  const hasSelection = facets.some(
    (facet) => facetSelection(controls, facet.key, facet.options).length > 0
  )

  if (!hasSelection) {
    return null
  }

  return (
    // The Command root pads all around; breaking out of it lets the
    // separator run edge to edge while the button keeps the same 4px
    // breathing room on every side.
    <div className="-mx-1 -mb-1 border-t p-1">
      <Button
        className="w-full"
        onClick={() => {
          for (const facet of facets) {
            controls.setFacet(facet.key, [])
          }
        }}
        type="button"
        variant="ghost"
      >
        <ListX className="text-muted-foreground" />
        Clear selection
      </Button>
    </div>
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
          keywords={[option.label]}
          onSelect={() =>
            controls.setFacet(
              facet.key,
              toggledFacet(selection, option.value, facet.options)
            )
          }
          // Identity is the entity's own key — duplicate labels must stay
          // separate options.
          value={`${facet.key}:${option.value}`}
        >
          {option.icon === undefined ? null : (
            <option.icon className="text-muted-foreground" />
          )}
          <span className="truncate">{option.label}</span>
          {option.hint === undefined ? null : (
            <span className="truncate text-[0.625rem] text-muted-foreground">
              {option.hint}
            </span>
          )}
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
