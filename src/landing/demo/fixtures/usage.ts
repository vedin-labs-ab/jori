import { day } from "./clock"
import { folderId } from "./folders"
import { jobId } from "./jobs"
import { type FolderId, type JobId } from "./types"

// What Copperline's work has cost, one row per contributor per day, in the
// shape the backend's rollup keeps: the folder the run was filed in, the
// job it came from, and the day's money and run counts. The views derive
// every window from these rows the way the backend does.

export type UsageRow = {
  date: string
  folderId?: FolderId
  job?: { id: JobId; label: string }
  micros: number
  ended: number
  failed: number
}

type Cadence = "daily" | "weekdays" | "weekly" | "event"

type Contributor = {
  key: string
  label: string
  folder?: string
  cadence: Cadence
  /** For a weekly cadence, the UTC weekday it runs on. */
  weekday?: number
  /** The contributor's last month, which the generated days add up to. */
  micros: number
  ended: number
  failed: number
}

/** How far back the rows reach: the longest window and the one before it. */
const historyDays = 180

/** The month every contributor's figures are stated for. */
const windowDays = 30

const contributors: Contributor[] = [
  contributor(
    "triage",
    "Ticket triage",
    "engineering",
    "event",
    49_300_000,
    652,
    2
  ),
  contributor(
    "flaky",
    "Flaky test triage",
    "engineering",
    "event",
    31_200_000,
    300,
    3
  ),
  contributor(
    "changelog",
    "Changelog",
    "marketing",
    "event",
    22_450_000,
    26,
    0
  ),
  contributor(
    "digest",
    "Design review digest",
    "design",
    "weekdays",
    22_150_000,
    22,
    1
  ),
  contributor(
    "competitor",
    "Competitor watch",
    "marketing",
    "daily",
    18_600_000,
    30,
    0
  ),
  contributor(
    "watch",
    "Renewals watch",
    "renewals",
    "daily",
    18_350_000,
    30,
    1
  ),
  {
    key: "interactive",
    label: "Interactive work",
    cadence: "event",
    micros: 14_900_000,
    ended: 155,
    failed: 2,
  },
  {
    ...contributor(
      "release",
      "Weekly release summary",
      "engineering",
      "weekly",
      9_400_000,
      4,
      0
    ),
    weekday: 5,
  },
  {
    ...contributor(
      "chase",
      "Chase overdue invoices",
      "renewals",
      "weekly",
      400_000,
      5,
      0
    ),
    weekday: 1,
  },
]

export function demoUsage(now: number): UsageRow[] {
  const days = Array.from(
    { length: historyDays },
    (_, offset) => now - offset * day
  )

  return contributors.flatMap((entry) => contributorRows(entry, days))
}

/** The calendar day a moment falls on, in the zone the rows are kept in. */
export function usageDate(at: number) {
  return new Date(at).toISOString().slice(0, 10)
}

function contributor(
  key: string,
  label: string,
  folder: string,
  cadence: Cadence,
  micros: number,
  ended: number,
  failed: number
): Contributor {
  return { key, label, folder, cadence, micros, ended, failed }
}

/** The contributor's days, newest first. The last month lands exactly on
 *  the stated figures; earlier days follow the same rhythm, so a longer
 *  window and the window before add up to something in the same key. */
function contributorRows(entry: Contributor, days: number[]): UsageRow[] {
  const weights = days.map((at, offset) => weight(entry, at, offset))
  const window = weights.slice(0, windowDays)
  const total = window.reduce((sum, value) => sum + value, 0)
  const micros = apportion(entry.micros, window)
  const ended = apportion(entry.ended, window)
  const failed = apportion(entry.failed, window)
  const identity = {
    ...(entry.folder === undefined ? {} : { folderId: folderId(entry.folder) }),
    ...(entry.key === "interactive"
      ? {}
      : { job: { id: jobId(entry.key), label: entry.label } }),
  }

  return days.flatMap((at, offset) => {
    const share = total === 0 ? 0 : weights[offset] / total
    const figures =
      offset < windowDays
        ? {
            micros: micros[offset],
            ended: ended[offset],
            failed: failed[offset],
          }
        : {
            micros: Math.round(entry.micros * share),
            ended: Math.round(entry.ended * share),
            failed: Math.round(entry.failed * share * 0.7),
          }

    return figures.ended === 0 && figures.micros === 0
      ? []
      : [{ date: usageDate(at), ...identity, ...figures }]
  })
}

/** How much of its month a day carries: a schedule's own days, or, for
 *  work that arrives when it arrives, a quiet weekend and a noisy week. */
function weight(entry: Contributor, at: number, offset: number) {
  const weekday = new Date(at).getUTCDay()
  const isWeekend = weekday === 0 || weekday === 6

  switch (entry.cadence) {
    case "daily":
      return 1
    case "weekdays":
      return isWeekend ? 0 : 1
    case "weekly":
      return weekday === entry.weekday ? 1 : 0
    case "event":
      return isWeekend
        ? 0.15 * noise(entry.key, offset)
        : 0.6 + 0.8 * noise(entry.key, offset)
  }
}

/** A steady, made-up signal in [0, 1): the same for a key and a day on
 *  every render, on the server and the client alike. */
function noise(key: string, offset: number) {
  let seed = Math.imul(offset + 1, 2654435761) >>> 0

  for (const character of key) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0
  }

  return (seed % 1000) / 1000
}

/** Whole units split by weight, the remainder going to the days that were
 *  rounded down the most, so the parts add up to exactly the total. */
function apportion(total: number, weights: number[]) {
  const sum = weights.reduce((result, value) => result + value, 0)

  if (sum === 0) {
    return weights.map(() => 0)
  }

  const quotas = weights.map((value) => (total * value) / sum)
  const parts = quotas.map((quota) => Math.floor(quota))
  const remainders = quotas
    .map((quota, index) => ({ index, fraction: quota - Math.floor(quota) }))
    .sort((left, right) => right.fraction - left.fraction)
  let remainder = total - parts.reduce((result, value) => result + value, 0)

  for (const { index } of remainders) {
    if (remainder <= 0) {
      break
    }

    parts[index] += 1
    remainder -= 1
  }

  return parts
}
