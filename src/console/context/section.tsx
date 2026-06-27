import { type ReactNode } from "react"

export function ContextSectionTitle({
  action,
  children,
  count,
}: {
  action?: ReactNode
  children: string
  count?: number
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-baseline gap-1.5 font-medium text-muted-foreground text-xs">
        <span>{children}</span>
        {count === undefined ? null : (
          <span className="font-normal text-muted-foreground/70 tabular-nums">
            ({count})
          </span>
        )}
      </h3>
      {action}
    </div>
  )
}
