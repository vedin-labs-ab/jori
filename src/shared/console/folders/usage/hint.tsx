import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConsoleLink } from "../../shell/link"
import { defaultUsageDays } from "./types"

// What a folder — or the whole tree — has cost lately, sized to sit beside
// its breadcrumb. It is meta about the page rather than the page's own
// name, so it stays quiet until it is pointed at, and it names its window
// out loud: an amount with no period attached says nothing.
//
// The window is the Usage page's default, which is also the window the
// backend's hint query fixes, so the figure survives the click that opens
// the page behind it.

/** The breadcrumb trigger's own recipe: no padding at rest, so the header's
 *  gaps stay optically even, growing on hover so the ghost background reads
 *  as the new edge. Muted, because the page's name is the loud thing here.
 *  The two scopes are written out rather than switched inside one link, so
 *  each route keeps the params it is typed to take. */
export function UsageHintButton({
  amount,
  folderId,
}: {
  /** The spend, already formatted as money. */
  amount: string
  /** Absent across the whole organization. */
  folderId?: string
}) {
  const label = `Usage: ${amount} in the last ${defaultUsageDays} days`
  const figure = (
    <>
      <span className="truncate tabular-nums">
        {amount} · {defaultUsageDays} days
      </span>
      {/* Collapsed rather than merely transparent, so the hint claims no
          width it is not using and nothing beside it shifts. */}
      <ArrowUpRight
        aria-hidden
        className="h-3 w-0 shrink-0 overflow-hidden opacity-0 transition-[width,opacity] duration-150 group-focus-visible:w-3 group-focus-visible:opacity-100 group-hover:w-3 group-hover:opacity-100"
      />
    </>
  )

  return (
    <Button
      asChild
      className="group min-w-0 gap-1 font-normal text-muted-foreground text-xs hover:text-foreground focus-visible:text-foreground"
      flush
      variant="ghost"
    >
      {folderId === undefined ? (
        <ConsoleLink aria-label={label} to="/folders/usage">
          {figure}
        </ConsoleLink>
      ) : (
        <ConsoleLink
          aria-label={label}
          params={{ folderId }}
          to="/folders/$folderId/usage"
        >
          {figure}
        </ConsoleLink>
      )}
    </Button>
  )
}
