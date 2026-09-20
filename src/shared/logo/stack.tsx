import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type LogoSize = "sm" | "md"

export function LogoStack<T extends string>({
  items,
  label,
  renderLogo,
  size = "sm",
}: {
  items: readonly T[]
  label: (item: T) => string
  renderLogo: (item: T) => ReactNode
  size?: LogoSize
}) {
  const uniqueItems = [...new Set(items)]
  const visibleCount = uniqueItems.length > 3 ? 2 : 3
  const visibleItems = uniqueItems.slice(0, visibleCount)
  const hiddenItems = uniqueItems.slice(visibleCount)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <span className="inline-flex shrink-0 items-center">
      <span
        className={cn(
          "-space-x-1 inline-flex",
          size === "md"
            ? "[--logo-size:--spacing(5)]"
            : "[--logo-size:--spacing(4)]"
        )}
      >
        {/* Cut away the overlap to expose the actual parent background,
            including hover states. Keep the mask outside ink inversion. */}
        {visibleItems.map((item) => (
          <span
            className="inline-flex size-(--logo-size) shrink-0 items-center justify-center not-first:mask-[radial-gradient(circle_at_calc(--spacing(1)_-_var(--logo-size)/2)_50%,transparent_calc(var(--logo-size)/2_+_1.5px),currentColor_calc(var(--logo-size)/2_+_2px))]"
            key={item}
          >
            {renderLogo(item)}
          </span>
        ))}
      </span>
      {hiddenItems.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={`Show ${hiddenItems.length} more integrations: ${hiddenItems.map(label).join(", ")}`}
              className={cn(
                "ml-1 inline-flex items-center justify-center rounded-sm px-1 text-muted-foreground leading-none outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                size === "md"
                  ? "h-5 min-w-5 text-[0.6875rem]"
                  : "h-4 min-w-4 text-[0.625rem]"
              )}
              type="button"
            >
              +{hiddenItems.length}
            </button>
          </TooltipTrigger>
          <TooltipContent>{hiddenItems.map(label).join(", ")}</TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  )
}
