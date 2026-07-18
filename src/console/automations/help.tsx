import { CircleHelp } from "lucide-react"
import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Suffix help icon for a label; the children fill its tooltip. */
export function FieldHelp({
  children,
  label,
  side = "right",
}: {
  children: ReactNode
  label: string
  side?: "right" | "top"
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={label}
            className="inline-flex size-3 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            type="button"
          >
            <CircleHelp className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          align="center"
          className="max-w-80 items-start text-left leading-relaxed"
          side={side}
        >
          <div className="grid gap-1">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
