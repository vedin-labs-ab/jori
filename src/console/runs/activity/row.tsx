import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export function TimelineRow({
  children,
  icon,
  interactive = false,
  isFirst,
  isLast,
}: {
  children: ReactNode
  icon: ReactNode
  interactive?: boolean
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <li
      className={cn(
        "grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3",
        interactive ? "group/activity-task-row" : null
      )}
    >
      <div className="relative flex justify-center">
        {isFirst ? null : (
          <span className="absolute top-0 h-2 w-px bg-border" />
        )}
        {isLast ? null : (
          <span className="absolute top-9 bottom-0 w-px bg-border" />
        )}
        <span className="relative z-10 mt-2 grid size-7 place-items-center rounded-full border bg-background text-muted-foreground">
          {icon}
        </span>
      </div>
      <div className="min-w-0 py-1">{children}</div>
    </li>
  )
}
