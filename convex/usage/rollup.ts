import { type Doc, type Id } from "../_generated/dataModel"
import { shiftUsageDate, usageDate } from "./key"

// The read half of the rollup: a window of calendar days, and the few
// shapes a console view needs from the rows that fall inside it — one point
// per day, one total, one ranking. All pure, so which rows to read stays
// the caller's decision and none of this needs a database.

export const usageWindowLengths = [7, 30, 90] as const

export type UsageWindowLength = (typeof usageWindowLengths)[number]

/** Two adjacent windows of equal length: the one being shown, and the one
 *  before it that its delta is measured against. */
export type UsageWindow = {
  start: string
  end: string
  previousStart: string
  previousEnd: string
}

export type UsageFigures = {
  micros: number
  ended: number
  failed: number
}

/** One day, whole and divided: the figures for the day, and the same
 *  figures for each segment the caller groups its rows into. */
export type UsageDay = UsageFigures & {
  date: string
  segments: Record<string, UsageFigures>
}

export type UsageTotals = {
  micros: number
  ended: number
  failed: number
  tokens: { input: number; output: number }
}

/** One line of the ranking. The id is carried only while the automation
 *  itself still exists, so a caption is a link exactly when opening it
 *  would lead somewhere. */
export type UsageContributor = {
  id?: Id<"automations">
  label: string
  micros: number
  ended: number
  failed: number
}

/** Work with no automation behind it: someone asked Jori directly. It
 *  ranks beside the automations so the list still adds up to the total. */
const interactiveLabel = "Interactive work"

/** Its own grouping key, which no automation id can collide with. */
const interactiveKey = ""

/** The window ends today in the organization's own zone and reaches back
 *  the requested number of days, today included. */
export function usageWindowOf(
  days: UsageWindowLength,
  timeZone: string,
  now: number
): UsageWindow {
  const end = usageDate(now, timeZone)
  const start = shiftUsageDate(end, 1 - days)

  return {
    start,
    end,
    previousStart: shiftUsageDate(start, -days),
    previousEnd: shiftUsageDate(start, -1),
  }
}

export function isWithin(date: string, from: string, to: string) {
  return date >= from && date <= to
}

/** One point per day of the window, quiet days included: skipping them
 *  would compress a silent week into a single gap and make the chart lie
 *  about how spend is spread. Each row lands on its day twice, in the
 *  day's own figures and in the segment `segmentOf` files it under. */
export function usageSeries(
  rows: Doc<"usage">[],
  window: UsageWindow,
  segmentOf: (row: Doc<"usage">) => string
): UsageDay[] {
  const byDate = new Map<string, UsageDay>()

  for (
    let date = window.start;
    date <= window.end;
    date = shiftUsageDate(date, 1)
  ) {
    byDate.set(date, { date, micros: 0, ended: 0, failed: 0, segments: {} })
  }

  for (const row of rows) {
    const day = byDate.get(row.date)

    if (day !== undefined) {
      const key = segmentOf(row)

      addFigures(day, row)
      day.segments[key] = addFigures(
        day.segments[key] ?? { micros: 0, ended: 0, failed: 0 },
        row
      )
    }
  }

  return [...byDate.values()]
}

export function addFigures<Figures extends UsageFigures>(
  figures: Figures,
  row: Doc<"usage">
) {
  figures.micros += row.micros
  figures.ended += row.runs.ended
  figures.failed += row.runs.failed

  return figures
}

export function usageTotals(rows: Doc<"usage">[]): UsageTotals {
  return rows.reduce<UsageTotals>(
    (total, row) => ({
      micros: total.micros + row.micros,
      ended: total.ended + row.runs.ended,
      failed: total.failed + row.runs.failed,
      tokens: {
        input: total.tokens.input + row.tokens.input,
        output: total.tokens.output + row.tokens.output,
      },
    }),
    { micros: 0, ended: 0, failed: 0, tokens: { input: 0, output: 0 } }
  )
}

/** Every contributor to the window, largest first. Ranking is cheap and
 *  pure; how deep a list is worth carrying is the caller's decision, since
 *  only the caller knows what each named row costs it to resolve. */
export function rankContributors(rows: Doc<"usage">[]): UsageContributor[] {
  return sortContributors([...groupContributors(rows).values()])
}

/** The ranking's order, for a caller that has changed a row and has to put
 *  the list back in it. */
export function sortContributors(contributors: UsageContributor[]) {
  return [...contributors].sort(byMicros)
}

function groupContributors(rows: Doc<"usage">[]) {
  const byAutomation = new Map<string, UsageContributor>()

  for (const row of rows) {
    const key = row.automation?.id ?? interactiveKey
    const entry = byAutomation.get(key) ?? blankContributor(row)

    // Rows outlive renames, so the caption follows whichever row was
    // written last rather than whichever was read first.
    entry.label = row.automation?.label ?? interactiveLabel
    entry.micros += row.micros
    entry.ended += row.runs.ended
    entry.failed += row.runs.failed
    byAutomation.set(key, entry)
  }

  return byAutomation
}

function blankContributor(row: Doc<"usage">): UsageContributor {
  return {
    ...(row.automation === undefined ? {} : { id: row.automation.id }),
    label: interactiveLabel,
    micros: 0,
    ended: 0,
    failed: 0,
  }
}

function byMicros(left: UsageContributor, right: UsageContributor) {
  return right.micros === left.micros
    ? left.label.localeCompare(right.label)
    : right.micros - left.micros
}
