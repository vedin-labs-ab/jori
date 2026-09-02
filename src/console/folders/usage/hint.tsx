import { formatUsd } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { ArrowUpRight } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { api } from "../../../../convex/_generated/api"
import { ConsoleHeaderAside } from "../../shared/layout"
import { defaultUsageDays } from "./types"

// What a folder — or the whole tree — has cost lately, sized to sit beside
// its breadcrumb. It is meta about the page rather than the page's own
// name, so it stays quiet until it is pointed at, and it names its window
// out loud: an amount with no period attached says nothing.
//
// The window is the Usage page's default, which is also the window the
// backend's hint query fixes, so the figure survives the click that opens
// the page behind it.

/** A figure this small is not worth a loading state of its own: the hint
 *  shows nothing, divider included, until the number is real. */
export function FolderUsageHint({
  folderId,
  organizationId,
}: {
  /** Absent across the whole organization. */
  folderId?: GenericId<"folders">
  organizationId: string
}) {
  const spend = useQuery(api.folders.usage.spend, {
    organizationId,
    ...(folderId === undefined ? {} : { folderId }),
  })

  if (spend === undefined) {
    return null
  }

  const amount = formatUsd(spend.micros)

  return (
    <ConsoleHeaderAside>
      <UsageHintButton
        folderId={folderId}
        label={`Usage: ${amount} in the last ${defaultUsageDays} days`}
      >
        <span className="truncate tabular-nums">
          {amount} · {defaultUsageDays} days
        </span>
        {/* Collapsed rather than merely transparent, so the hint claims no
          width it is not using and nothing beside it shifts. */}
        <ArrowUpRight
          aria-hidden
          className="h-3 w-0 shrink-0 overflow-hidden opacity-0 transition-[width,opacity] duration-150 group-focus-visible:w-3 group-focus-visible:opacity-100 group-hover:w-3 group-hover:opacity-100"
        />
      </UsageHintButton>
    </ConsoleHeaderAside>
  )
}

/** The breadcrumb trigger's own recipe: no padding at rest, so the header's
 *  gaps stay optically even, growing on hover so the ghost background reads
 *  as the new edge. Muted, because the page's name is the loud thing here.
 *  The two scopes are written out rather than switched inside one Link, so
 *  each route keeps the params it is typed to take. */
function UsageHintButton({
  children,
  folderId,
  label,
}: {
  children: ReactNode
  folderId?: GenericId<"folders">
  label: string
}) {
  return (
    <Button
      asChild
      className="group min-w-0 gap-1 px-0 font-normal text-muted-foreground text-xs hover:px-1.5 hover:text-foreground focus-visible:px-1.5 focus-visible:text-foreground"
      variant="ghost"
    >
      {folderId === undefined ? (
        <Link aria-label={label} to="/folders/usage">
          {children}
        </Link>
      ) : (
        <Link
          aria-label={label}
          params={{ folderId }}
          to="/folders/$folderId/usage"
        >
          {children}
        </Link>
      )}
    </Button>
  )
}
