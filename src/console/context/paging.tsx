import { ChevronDown } from "lucide-react"
import { type ReactNode, useState } from "react"
import { cn } from "@/lib/utils"

// Renders a capped slice of a list with the standardized disclosure control
// underneath once the list exceeds the initial count.
export function Paged<Item>({
  items,
  initialCount = 3,
  step = 5,
  children,
}: {
  items: Item[]
  initialCount?: number
  step?: number
  children: (visible: Item[], hiddenCount: number) => ReactNode
}) {
  const [visibleCount, setVisibleCount] = useState(initialCount)
  const visible = items.slice(0, visibleCount)
  const hiddenCount = items.length - visible.length

  return (
    <div className="flex flex-col gap-1">
      {children(visible, hiddenCount)}
      {items.length > initialCount ? (
        <PagingButton
          label={
            hiddenCount > 0
              ? `Show ${Math.min(step, hiddenCount)} more`
              : "Show less"
          }
          onClick={() =>
            setVisibleCount(
              hiddenCount > 0
                ? Math.min(visibleCount + step, items.length)
                : initialCount
            )
          }
          rotated={hiddenCount === 0}
        />
      ) : null}
    </div>
  )
}

// The one disclosure control for paged lists: a flush primary text button
// that dims on hover instead of underlining, echoing the expandable-text
// "Show less" cue.
function PagingButton({
  label,
  onClick,
  rotated,
}: {
  label: string
  onClick: () => void
  rotated: boolean
}) {
  return (
    <button
      className="flex w-fit cursor-pointer select-none items-center gap-1 rounded-sm py-0.5 font-medium text-primary text-xs outline-none transition hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring/30"
      onClick={onClick}
      type="button"
    >
      {label}
      <ChevronDown
        className={cn("size-4 transition-transform", rotated && "rotate-180")}
      />
    </button>
  )
}
