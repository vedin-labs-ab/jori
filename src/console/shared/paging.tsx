import { ChevronDown } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Renders a capped slice of a list with a standardized "Show N more" /
// "Show less" control underneath once the list exceeds the initial count.
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
        <Button
          className="-ml-2 w-fit"
          onClick={() =>
            setVisibleCount(
              hiddenCount > 0
                ? Math.min(visibleCount + step, items.length)
                : initialCount
            )
          }
          size="sm"
          type="button"
          variant="link"
        >
          {hiddenCount > 0
            ? `Show ${Math.min(step, hiddenCount)} more`
            : "Show less"}
          <ChevronDown
            className={cn(
              "transition-transform",
              hiddenCount === 0 && "rotate-180"
            )}
          />
        </Button>
      ) : null}
    </div>
  )
}
