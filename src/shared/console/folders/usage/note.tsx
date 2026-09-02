import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type UsageDays } from "./types"

/** The fine print, hung off the page's name in its crumb: which day a day
 *  is, what a change is measured against, and what the money is a price
 *  for. The zone comes as a prop, so the note reads the same from either
 *  scope and before any usage has loaded. */
export function UsageNoteButton({
  days,
  timezone,
}: {
  days: UsageDays
  /** The zone the days follow, as the sentence names it. */
  timezone: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label="About these figures"
          className="text-muted-foreground hover:text-foreground"
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <Info />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Days follow {timezone}. Changes compare with the previous {days} days.
        LLM usage is priced at provider list rates.
      </TooltipContent>
    </Tooltip>
  )
}
