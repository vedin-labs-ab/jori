import { formatUsd } from "@contracts/billing"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ConsoleFilterToggle } from "../../shared/layout"
import {
  parseUsageDays,
  type UsageDays,
  type UsageOverview,
  usageWindowOptions,
} from "./types"

/** The band the page opens with: what the window cost, how it compares with
 *  the window before it, and how much work it bought — beside the control
 *  that sets the window. The toggle keeps its place while figures load, so
 *  changing the window never moves the control out from under the pointer. */
export function UsageStats({
  days,
  onDaysChange,
  usage,
}: {
  days: UsageDays
  onDaysChange: (days: UsageDays) => void
  usage: UsageOverview | undefined
}) {
  const failed = usage?.totals.failed ?? 0

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
        <Stat
          detail={usage === undefined ? undefined : deltaLabel(usage, days)}
          label="Spend"
          value={usage === undefined ? "—" : formatUsd(usage.totals.micros)}
        />
        <Stat label="Runs" value={countValue(usage?.totals.ended)} />
        <Stat
          label="Failed"
          tone={failed > 0 ? "destructive" : "muted"}
          value={countValue(usage?.totals.failed)}
        />
      </div>
      <ConsoleFilterToggle
        label="Window"
        onValueChange={(value) => onDaysChange(parseUsageDays(Number(value)))}
        options={usageWindowOptions}
        value={String(days)}
      />
    </div>
  )
}

function Stat({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail?: ReactNode
  label: string
  tone?: "default" | "destructive" | "muted"
  value: string
}) {
  return (
    <div className="min-w-24">
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
        {value}
      </p>
      {detail === undefined ? null : (
        <p className="mt-1.5 text-muted-foreground text-xs/relaxed tabular-nums">
          {detail}
        </p>
      )}
    </div>
  )
}

function countValue(count: number | undefined) {
  return count === undefined ? "—" : count.toLocaleString("en-US")
}

/** Signed against the window that came just before, which is the only
 *  comparison the payload carries and the only one worth a glance. */
function deltaLabel(usage: UsageOverview, days: UsageDays) {
  const delta = usage.totals.micros - usage.previous.micros

  if (delta === 0) {
    return `Level with the previous ${days} days`
  }

  const amount = delta > 0 ? `+${formatUsd(delta)}` : formatUsd(delta)

  return `${amount} vs the previous ${days} days`
}
