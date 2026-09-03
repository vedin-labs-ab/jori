import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** A quiet mark after a row's name: a muted icon that says one thing
 *  about the row, named in a tooltip and for screen readers. Visibility
 *  narrower than the organization, a paused job. */
export function RowMark({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="shrink-0 text-muted-foreground [&_svg]:size-4">
          {icon}
          <span className="sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
