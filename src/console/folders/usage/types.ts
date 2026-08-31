import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../convex/_generated/api"

// What the Usage views read, and the one control they offer. The backend
// hands back a finished payload — zero-filled series, ranked lists, a
// remainder — so nothing here recomputes money.

export type UsageOverview = FunctionReturnType<
  typeof api.folders.usage.overview
>
export type UsageDay = UsageOverview["series"][number]
export type UsageContributor = UsageOverview["automations"][number]
export type UsageFolder = UsageOverview["folders"][number]

export const usageWindowDays = [7, 30, 90] as const

export type UsageDays = (typeof usageWindowDays)[number]

/** A month by default: long enough for a weekly automation to show up more
 *  than once, short enough to still be about now. */
export const defaultUsageDays: UsageDays = 30

/** A parameter naming anything else falls back to the default rather than
 *  failing the route. */
export function parseUsageDays(value: unknown): UsageDays {
  return usageWindowDays.find((days) => days === value) ?? defaultUsageDays
}

/** The usage panel rides in the URL as one parameter — present while it is
 *  open, valued with the window it shows — so the view someone found worth
 *  reading is a view they can send on. */
export function usageSearch(value: unknown): { usage?: UsageDays } {
  return value === undefined ? {} : { usage: parseUsageDays(value) }
}

/** Toggle options; the group's value is a string, as toggle values are. */
export const usageWindowOptions = usageWindowDays.map((days) => ({
  label: `${days} days`,
  value: String(days),
}))

/** How much of the leader a row represents, for its proportion bar. */
export function usageShare(micros: number, leaderMicros: number) {
  return leaderMicros <= 0 ? 0 : Math.round((micros / leaderMicros) * 100)
}

/** A `YYYY-MM-DD` bucket read back as the calendar day it names. Parsing
 *  fixes it to UTC midnight and formatting reads it back there, so the
 *  reader's own zone can never shift the label onto the day before. */
export function usageDayLabel(date: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...(style === "long" ? { weekday: "short", year: "numeric" } : {}),
  }).format(new Date(`${date}T00:00:00Z`))
}
