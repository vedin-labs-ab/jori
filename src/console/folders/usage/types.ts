import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../convex/_generated/api"

// What the Usage views read, and the controls they offer. The backend hands
// back a finished payload — zero-filled series, ranked lists, totals for
// this window and the one before — so nothing here recomputes money; the
// helpers below only read it back as the figures the page shows.

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

/** The window rides in the URL so a view can be shared or reloaded. A
 *  parameter naming anything else falls back to the default rather than
 *  failing the route. */
export function parseUsageDays(value: unknown): UsageDays {
  return usageWindowDays.find((days) => days === value) ?? defaultUsageDays
}

/** The route's search, normalized: the default window leaves no parameter
 *  behind, so the plain URL is the one people share. */
export function usageDaysSearch(value: unknown): { days?: UsageDays } {
  const days = parseUsageDays(value)

  return days === defaultUsageDays ? {} : { days }
}

/** The window control's options; a select's value is a string. */
export const usageWindowOptions = usageWindowDays.map((days) => ({
  label: `Last ${days} days`,
  value: String(days),
}))

/** How much of the leader a row is, for its bar: the biggest row fills its
 *  cell and every other is drawn against it. */
export function usageShare(micros: number, leaderMicros: number) {
  return leaderMicros <= 0 ? 0 : Math.round((micros / leaderMicros) * 100)
}

/** A part of a whole as the whole percent it rounds to. A part too small
 *  to round to one is named as small rather than rounded to nothing, and a
 *  whole of nothing has no parts. */
export function usagePercent(part: number, whole: number) {
  if (whole <= 0 || part <= 0) {
    return undefined
  }

  const percent = (part / whole) * 100

  return percent < 0.5 ? "<1%" : `${Math.round(percent)}%`
}

export type UsageDelta = {
  direction: "up" | "down" | "level"
  percent: number
}

/** How far a figure moved from the window before, as a percent of what it
 *  was. Nothing to measure against is no delta rather than an infinite one,
 *  and a move too small to round to a percent reads as level. */
export function usageDelta(
  current: number,
  previous: number
): UsageDelta | undefined {
  if (previous <= 0) {
    return undefined
  }

  const percent = Math.round(((current - previous) / previous) * 100)

  return {
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "level",
    percent: Math.abs(percent),
  }
}

/** What one run cost on average; no runs, no average. */
export function usageCostPerRun(micros: number, ended: number) {
  return ended > 0 ? micros / ended : undefined
}

/** The slice the charts are filtered to, as the series query wants it. A
 *  choice the current overview no longer ranks reads as no filter at all,
 *  so changing the window cannot leave the charts on a vanished row. */
export function usageSlice(value: string, usage: UsageOverview) {
  const automation = usage.automations.find((entry) => entry.id === value)

  if (automation?.id !== undefined) {
    return { automationId: automation.id }
  }

  const folder = usage.folders.find((entry) => entry.folderId === value)

  return folder === undefined ? undefined : { folderId: folder.folderId }
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
