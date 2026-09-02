import { ListFilter } from "lucide-react"
import { type Ref } from "react"
import { ConsoleHeaderButton } from "../layout"

/** The header's way into the panel. Off its defaults, the button fills in
 *  and carries the count of facets in play as a muted suffix; it hides
 *  with the label on small screens, where the name still says how many. */
export function ConsoleFilterButton({
  activeCount,
  onClick,
  open,
  ref,
}: {
  activeCount: number
  onClick: () => void
  open: boolean
  ref: Ref<HTMLButtonElement>
}) {
  const active = activeCount > 0

  return (
    <ConsoleHeaderButton
      aria-label={active ? `Filters, ${activeCount} active` : "Filters"}
      aria-pressed={open}
      data-slot="filters-trigger"
      icon={<ListFilter />}
      label="Filters"
      onClick={onClick}
      ref={ref}
      type="button"
      variant={active ? "secondary" : "outline"}
    >
      {active ? (
        <span className="text-muted-foreground tabular-nums max-sm:hidden">
          {activeCount}
        </span>
      ) : null}
    </ConsoleHeaderButton>
  )
}
