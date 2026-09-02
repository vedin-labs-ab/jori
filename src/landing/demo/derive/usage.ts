import {
  type UsageDays,
  type UsageOverview,
} from "@/shared/console/folders/usage/types"
import { day } from "../fixtures/clock"
import { type FolderId } from "../fixtures/types"
import { type UsageRow, usageDate } from "../fixtures/usage"
import { type DemoState } from "../state/types"
import { folderOf, subtreeIds } from "./folders"

// One window of usage, reduced the way the backend reduces it: the window's
// totals beside the previous window's, the ranked contributors, and the
// scope divided one level down as both a ranking and a daily series.

type Figures = { micros: number; ended: number; failed: number }
type Segment = UsageOverview["folders"][number]
type Contributor = UsageOverview["jobs"][number]

/** The window the breadcrumb hint counts: the Usage page's default. */
const hintDays: UsageDays = 30

/** Segments past the console's palette fold into one unnamed rest. */
const segmentLimit = 8

export function usageOverview(
  state: DemoState,
  scope: FolderId | undefined,
  days: UsageDays
): UsageOverview {
  const dates = windowDates(state.now, days)
  const previousDates = windowDates(state.now - days * day, days)
  const inScope = scopedRows(state, scope)
  const current = inScope.filter((row) => dates.includes(row.date))
  const previous = inScope.filter((row) => previousDates.includes(row.date))
  const { segments, segmentOf } = segmentFolders(state, current, scope)

  return {
    series: dates.map((date) => {
      const rows = current.filter((row) => row.date === date)
      const segmented: Record<string, Figures> = {}

      for (const row of rows) {
        const key = segmentOf(row)

        segmented[key] = add(segmented[key] ?? blank(), row)
      }

      return { date, ...total(rows), segments: segmented }
    }),
    totals: totals(current),
    previous: totals(previous),
    jobs: rankContributors(state, current),
    folders: segments,
  }
}

/** What the scope has cost over the hint's window, in micros. */
export function usageSpend(state: DemoState, scope: FolderId | undefined) {
  const dates = windowDates(state.now, hintDays)

  return total(
    scopedRows(state, scope).filter((row) => dates.includes(row.date))
  ).micros
}

/** The window's calendar days, oldest first, ending on the day of `end`. */
function windowDates(end: number, days: number) {
  return Array.from({ length: days }, (_, index) =>
    usageDate(end - (days - 1 - index) * day)
  )
}

/** A folder scope sums itself and everything below it; no scope is the
 *  whole organization, unfiled work included. */
function scopedRows(state: DemoState, scope: FolderId | undefined) {
  if (scope === undefined) {
    return state.usage
  }

  const ids = subtreeIds(state, scope)

  return state.usage.filter(
    (row) => row.folderId !== undefined && ids.has(row.folderId)
  )
}

/** The scope's rows divided one level down, biggest first: each child
 *  folder's whole subtree, the scope's own rows, and one unnamed rest. */
function segmentFolders(
  state: DemoState,
  rows: UsageRow[],
  scope: FolderId | undefined
) {
  const children = state.folders.filter((folder) => folder.parentId === scope)
  const childOf = new Map<string, FolderId>()

  for (const child of children) {
    for (const id of subtreeIds(state, child.folderId)) {
      childOf.set(id, child.folderId)
    }
  }

  const keyOf = (row: UsageRow) =>
    row.folderId === undefined || row.folderId === scope
      ? "direct"
      : (childOf.get(row.folderId) ?? "other")
  const figures = new Map<string, Segment>()

  for (const row of rows) {
    const key = keyOf(row)
    const segment =
      figures.get(key) ?? openSegment(state, key, scope === undefined)

    figures.set(key, add(segment, row))
  }

  const ranked = [...figures.values()]
    .filter((segment) => segment.micros > 0)
    .sort(bySpend)
  const named = ranked.filter((segment) => segment.key !== "other")
  const other = ranked.find((segment) => segment.key === "other") ?? {
    ...openSegment(state, "other", false),
  }

  for (const overflow of named.slice(segmentLimit)) {
    add(other, overflow)
  }

  const shown = named.slice(0, segmentLimit)
  const shownKeys = new Set(shown.map((segment) => segment.key))

  return {
    segments: other.micros > 0 ? [...shown, other] : shown,
    segmentOf: (row: UsageRow) => {
      const key = keyOf(row)

      return shownKeys.has(key) ? key : "other"
    },
  }
}

function openSegment(
  state: DemoState,
  key: string,
  isOrganization: boolean
): Segment {
  if (key === "direct") {
    return { ...blank(), key, label: isOrganization ? "Unfiled" : "Filed here" }
  }

  if (key === "other") {
    return { ...blank(), key, label: "Other" }
  }

  return {
    ...blank(),
    key,
    label: folderOf(state, key)?.name ?? "Other",
    folderId: key as FolderId,
  }
}

/** Every contributor to the window, largest first. A deleted job keeps
 *  its caption and loses its id, so its row is history and not a link. */
function rankContributors(state: DemoState, rows: UsageRow[]): Contributor[] {
  const byJob = new Map<string, Contributor>()

  for (const row of rows) {
    const key = row.job?.id ?? ""
    const entry = byJob.get(key) ?? {
      ...blank(),
      label: row.job?.label ?? "Interactive work",
      ...(row.job !== undefined &&
      state.jobs.some((job) => job.id === row.job?.id)
        ? { id: row.job.id }
        : {}),
    }

    byJob.set(key, add(entry, row))
  }

  return [...byJob.values()].sort(bySpend)
}

function totals(rows: UsageRow[]) {
  const figures = total(rows)

  return {
    ...figures,
    tokens: {
      input: Math.round(figures.micros / 8),
      output: Math.round(figures.micros / 60),
    },
  }
}

function total(rows: UsageRow[]): Figures {
  return rows.reduce((sum, row) => add(sum, row), blank())
}

function add<Sum extends Figures>(sum: Sum, row: Figures): Sum {
  sum.micros += row.micros
  sum.ended += row.ended
  sum.failed += row.failed

  return sum
}

function blank(): Figures {
  return { micros: 0, ended: 0, failed: 0 }
}

function bySpend(
  left: Figures & { label: string },
  right: Figures & { label: string }
) {
  return right.micros === left.micros
    ? left.label.localeCompare(right.label)
    : right.micros - left.micros
}
