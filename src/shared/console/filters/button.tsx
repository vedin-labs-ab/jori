import { ListFilter, X } from "lucide-react"
import { type Ref } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { ConsoleHeaderButton } from "../layout"

/** The header's way into the panel. Off its defaults, the button fills in
 *  and a quiet count sits beside it; hovering or focusing the count turns
 *  it into a clear control, so the filters come off without opening the
 *  panel. Both hide with the label on small screens, where the button's
 *  name still says how many. */
export function ConsoleFilterButton({
  activeCount,
  onClear,
  onClick,
  open,
  ref,
}: {
  activeCount: number
  onClear: () => void
  onClick: () => void
  open: boolean
  ref: Ref<HTMLButtonElement>
}) {
  const active = activeCount > 0
  const variant = active ? "secondary" : "outline"
  const trigger = (
    <ConsoleHeaderButton
      aria-label={active ? `Filters, ${activeCount} active` : "Filters"}
      aria-pressed={open}
      data-slot="filters-trigger"
      icon={<ListFilter />}
      label="Filters"
      onClick={onClick}
      ref={ref}
      type="button"
      variant={variant}
    />
  )

  // One tree whether or not the count shows, so the button keeps focus
  // when the clear control leaves beside it.
  return (
    <ButtonGroup className="max-sm:contents">
      {trigger}
      {active ? (
        <Button
          aria-label={`Clear ${activeCount === 1 ? "filter" : "filters"}`}
          className="group/clear max-sm:hidden"
          onClick={onClear}
          size="icon"
          title="Clear filters"
          type="button"
          variant={variant}
        >
          <span className="grid place-items-center *:[grid-area:1/1]">
            <span className="text-muted-foreground text-xs tabular-nums group-focus-visible/clear:invisible group-hover/clear:invisible">
              {activeCount}
            </span>
            <X className="invisible size-3.5 group-focus-visible/clear:visible group-hover/clear:visible" />
          </span>
        </Button>
      ) : null}
    </ButtonGroup>
  )
}
