import { Info } from "lucide-react"
import { type ReactNode } from "react"
import { FieldHelp } from "@/shared/field"

export function ContextSectionTitle({
  action,
  children,
  count,
  hint,
}: {
  action?: ReactNode
  children: string
  count?: number
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-baseline gap-1.5 font-medium text-muted-foreground text-xs">
        <span>{children}</span>
        {count === undefined ? null : <ContextTitleCount count={count} />}
        {/* The same hint affordance the forms use: a button, so the tooltip
            is reachable by keyboard rather than by pointer alone. */}
        {hint === undefined ? null : (
          <span className="self-center">
            <FieldHelp icon={Info} label={`About ${children.toLowerCase()}`}>
              {hint}
            </FieldHelp>
          </span>
        )}
      </h3>
      {action}
    </div>
  )
}

export function ContextTitleCount({ count }: { count: number }) {
  return (
    <span className="font-normal text-muted-foreground tabular-nums">
      ({count})
    </span>
  )
}
