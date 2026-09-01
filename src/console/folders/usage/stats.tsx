import { formatUsd } from "@contracts/billing"
import { ArrowDown, ArrowUp } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  type UsageDelta,
  type UsageOverview,
  usageCostPerRun,
  usageDelta,
  usagePercent,
} from "./types"

// The band the page opens with: what the window cost, how much work that
// bought, and how each compares with the window before. The band keeps its
// four places while figures load, so changing the window never moves the
// page under the reader.

type Totals = UsageOverview["totals"]

const labels = ["Spend", "Runs", "Failed", "Cost / run"] as const

export function UsageStats({ usage }: { usage: UsageOverview | undefined }) {
  if (usage === undefined) {
    return (
      <Band>
        {labels.map((label) => (
          <Stat key={label} label={label} />
        ))}
      </Band>
    )
  }

  const { totals, previous } = usage
  const costPerRun = usageCostPerRun(totals.micros, totals.ended)

  return (
    <Band>
      <Stat
        detail={deltaDetail(usageDelta(totals.micros, previous.micros))}
        label="Spend"
        value={formatUsd(totals.micros)}
      />
      <Stat
        detail={deltaDetail(usageDelta(totals.ended, previous.ended))}
        label="Runs"
        value={count(totals.ended)}
      />
      <Stat
        detail={failedDetail(totals)}
        label="Failed"
        tone={totals.failed > 0 ? "destructive" : "muted"}
        value={count(totals.failed)}
      />
      <Stat
        detail={deltaDetail(costDelta(totals, previous))}
        label="Cost / run"
        value={costPerRun === undefined ? undefined : formatUsd(costPerRun)}
      />
    </Band>
  )
}

function Band({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
      {children}
    </div>
  )
}

/** A figure has no place for a detail it cannot state, so a missing one
 *  leaves the line out rather than filling it with a dash. */
function Stat({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail?: ReactNode
  label: string
  tone?: "default" | "destructive" | "muted"
  value?: string
}) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-muted-foreground text-xs/relaxed">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-medium text-2xl tabular-nums tracking-tight",
          tone === "destructive" && "text-destructive",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value ?? "—"}
      </p>
      {detail === undefined ? null : (
        <p className="mt-1.5 flex items-center gap-1 text-muted-foreground text-xs/relaxed tabular-nums">
          {detail}
        </p>
      )}
    </div>
  )
}

function count(value: number) {
  return value.toLocaleString("en-US")
}

/** Against the window that came just before, which is the only comparison
 *  the payload carries. The arrow says which way; what it is measured
 *  against is stated once, in the page's footnote, rather than under
 *  every figure. */
function deltaDetail(delta: UsageDelta | undefined): ReactNode {
  if (delta === undefined) {
    return undefined
  }

  if (delta.direction === "level") {
    return "No change"
  }

  const Arrow = delta.direction === "up" ? ArrowUp : ArrowDown

  return (
    <>
      <Arrow aria-hidden className="size-3" />
      {`${delta.percent}%`}
    </>
  )
}

function failedDetail(totals: Totals) {
  const share = usagePercent(totals.failed, totals.ended)

  return share === undefined ? undefined : `${share} of runs`
}

/** Only measurable once both windows ran something. */
function costDelta(totals: Totals, previous: Totals) {
  const current = usageCostPerRun(totals.micros, totals.ended)
  const before = usageCostPerRun(previous.micros, previous.ended)

  return current === undefined || before === undefined
    ? undefined
    : usageDelta(current, before)
}
