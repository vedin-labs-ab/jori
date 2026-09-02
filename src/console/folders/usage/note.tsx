import { useQuery } from "convex/react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "../../../../convex/_generated/api"
import { type UsageDays } from "./types"

/** The fine print, hung off the page's name in its crumb: which day a day
 *  is, what a change is measured against, and what the money is a price
 *  for. It reads the zone itself, so the crumb can carry it before any
 *  usage has loaded and from either scope alike. The organization comes as
 *  a prop: the crumb is rendered in the shell's header, above the
 *  organization context the page's own content sits inside. */
export function UsageNote({
  days,
  organizationId,
}: {
  days: UsageDays
  organizationId: string
}) {
  const profile = useQuery(api.organization.profile.get, { organizationId })
  const timezone = profile?.declared?.timezone ?? "the organization's time zone"

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
