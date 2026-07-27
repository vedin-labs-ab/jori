import { CircleHelp, type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Suffix hint icon for a label; the children fill its tooltip. The icon is
 *  swappable so a field can say which kind of hint it is: a question mark
 *  explains, a lock states a constraint.
 *
 *  The glyph stays 12px and the pointer target grows to 24px through a
 *  pseudo-element, which is the only way to get there without spending
 *  layout: margins would eat the label's gap and move the icon. */
export function FieldHelp({
  children,
  icon: Icon = CircleHelp,
  label,
  side = "right",
}: {
  children: ReactNode
  icon?: LucideIcon
  label: string
  side?: "right" | "top"
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={label}
            className='relative inline-flex size-3 items-center justify-center rounded-sm text-muted-foreground transition-colors after:absolute after:-inset-1.5 after:content-[""] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'
            type="button"
          >
            <Icon className="size-3" />
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
