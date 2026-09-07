import { type ReactNode } from "react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/** The console's one floating bar: a toolbar that hovers centered over the
 *  bottom of a ConsoleListLayout, for what acts on the page from outside
 *  its flow — a selection's actions, a file's neighbors. It arrives from
 *  below, keeps inside its host's width and wraps before it would spill,
 *  and its host names it for assistive tech. */
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
    <div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-20 max-w-[calc(100%-2rem)] fade-in-0 slide-in-from-bottom-2 animate-in duration-200">
      <div
        aria-label={label}
        className={cn(
          "flex flex-wrap items-center rounded-lg border bg-background p-1 shadow-md",
          className
        )}
        role="toolbar"
      >
        {children}
      </div>
    </div>
  )
}

/** A hairline between a dock's groups, short of its full height. */
export function DockDivider({ className }: { className?: string }) {
  return (
    <Separator
      className={cn("data-vertical:h-4 data-vertical:self-auto", className)}
      orientation="vertical"
    />
  )
}
