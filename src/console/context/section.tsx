import { Info } from "lucide-react"
import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
        {hint === undefined ? null : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info
                aria-label={`About ${children.toLowerCase()}`}
                className="size-3 self-center text-muted-foreground/70"
              />
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{hint}</TooltipContent>
          </Tooltip>
        )}
      </h3>
      {action}
    </div>
  )
}

export function ContextTitleCount({ count }: { count: number }) {
  return (
    <span className="font-normal text-muted-foreground/70 tabular-nums">
      ({count})
    </span>
  )
}
