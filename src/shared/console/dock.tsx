import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** The console's one floating bar: a toolbar that hovers centered over the
 *  bottom of a ConsoleListLayout, for what acts on the page from outside
 *  its flow — a selection's actions, a file's neighbors. It arrives from
 *  below and its host names it for assistive tech.
 *
 *  The bar reads its host's width, not the window's: the wrapper spans the
 *  host and is the `dock` container. Where the host is roomy the groups
 *  sit in one row between hairlines; below 36rem they stack, each group
 *  centered on its own row under a horizontal rule, so a bar never wraps
 *  mid-group or strands a divider at a row's end. The wrapper lets the
 *  pointer through to the rows beneath; only the bar catches it. */
export function Dock({
  children,
  className,
  label,
}: {
  children: ReactNode
  className?: string
  label: string
}) {
  return (
    <div className="@container/dock pointer-events-none absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex justify-center">
      <div
        aria-label={label}
        className={cn(
          "pointer-events-auto flex max-w-full items-center gap-1 rounded-lg border bg-background p-1 shadow-md",
          "@max-xl/dock:flex-col @max-xl/dock:items-stretch @max-xl/dock:gap-0",
          "fade-in-0 slide-in-from-bottom-2 animate-in duration-200",
          className
        )}
        role="toolbar"
      >
        {children}
      </div>
    </div>
  )
}

/** One of a dock's groups: what stays together on a row when the dock
 *  stacks. */
export function DockGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 @max-xl/dock:justify-center",
        className
      )}
    >
      {children}
    </div>
  )
}

/** A hairline between a dock's groups: short of the bar's height in a
 *  row, across it between stacked rows. */
export function DockDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-4 w-px shrink-0 self-center bg-border",
        "@max-xl/dock:my-1 @max-xl/dock:h-px @max-xl/dock:w-auto @max-xl/dock:self-stretch",
        className
      )}
    />
  )
}
