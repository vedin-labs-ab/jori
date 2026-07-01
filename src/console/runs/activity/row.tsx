import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ProviderLogo } from "../../shared/logo/provider"

export function ActivitySurfaceDescription({
  label,
  surface,
}: {
  label: string
  surface: string | undefined
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <ProviderLogo className="size-4" surface={surface} />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}

export function ActivityMetadataLine({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full flex-1 basis-0 items-center overflow-hidden whitespace-nowrap text-muted-foreground",
        className
      )}
    >
      {isPrimitiveText(children) ? (
        <span className="min-w-0 truncate">{children}</span>
      ) : (
        children
      )}
    </span>
  )
}

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

function isPrimitiveText(value: ReactNode) {
  return typeof value === "string" || typeof value === "number"
}
