import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { optionalString } from "../../shared/input"
import { type ActivityItem } from "../activity/types"
import {
  matchesSummaryQuery,
  projectRunSummary,
  type RunSummary,
} from "../view/summary"
import { canSee } from "./access"
import { pageItems } from "./page"
import { uniqueRuns } from "./runs"

type RunFilters = {
  candidates: Doc<"runs">[]
  current: Doc<"runs">
  query?: string
  since?: number
  source?: "slack" | "github" | "linear" | "automation"
  status?: Doc<"runs">["status"]
  until?: number
}

type PageArgs = {
  cursor?: string
  limit?: number
}

export async function pageRunMatches(
  ctx: QueryCtx,
  filters: RunFilters,
  args: PageArgs
) {
  const runs = matchingRuns(filters)

  if (filters.query === undefined) {
    const page = pageItems(runs, args)

    return {
      cursor: page.cursor,
      runs: await projectRunSummaries(ctx, page.page),
    }
  }

  const summaries = await projectMatchingSummaries(ctx, runs, filters.query)
  const page = pageItems(summaries, args)

  return { cursor: page.cursor, runs: page.page }
}

function matchingRuns(filters: RunFilters) {
  return uniqueRuns(filters.candidates)
    .filter((run) => matchesRun(filters.current, run, filters))
    .sort((left, right) => right.createdAt - left.createdAt)
}

async function projectMatchingSummaries(
  ctx: QueryCtx,
  runs: Doc<"runs">[],
  query: string
) {
  const summaries: RunSummary[] = []

  for (const run of runs) {
    const summary = await projectRunSummary(ctx, run)

    if (matchesSummaryQuery(summary, query)) {
      summaries.push(summary)
    }
  }

  return summaries
}

async function projectRunSummaries(ctx: QueryCtx, runs: Doc<"runs">[]) {
  const summaries: RunSummary[] = []

  for (const run of runs) {
    summaries.push(await projectRunSummary(ctx, run))
  }

  return summaries
}

export function matchesActivityFilter(
  item: ActivityItem,
  filter:
    | ("agent" | "approval" | "error" | "file" | "model" | "tool")[]
    | undefined
) {
  if (filter === undefined || filter.length === 0) {
    return true
  }

  return filter.some((value) =>
    value === "error" ? item.status === "failed" : item.kind === value
  )
}

export function normalizeQuery(query: string | undefined) {
  return optionalString(query)?.toLowerCase()
}

export function normalizeTimestamp(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return undefined
  }

  return value
}

function matchesRun(
  current: Doc<"runs">,
  run: Doc<"runs">,
  filters: RunFilters
) {
  return (
    canSee(current, run) &&
    matchesStatus(run, filters.status) &&
    matchesSource(run, filters.source) &&
    matchesTime(run, filters.since, filters.until)
  )
}

function matchesStatus(
  run: Doc<"runs">,
  status: Doc<"runs">["status"] | undefined
) {
  return status === undefined || run.status === status
}

function matchesSource(run: Doc<"runs">, source: RunFilters["source"]) {
  if (source === undefined) {
    return true
  }

  return source === "automation"
    ? run.snapshot.source.type === "automation"
    : run.snapshot.source.surface === source
}

function matchesTime(
  run: Doc<"runs">,
  since: number | undefined,
  until: number | undefined
) {
  return (
    (since === undefined || run.createdAt >= since) &&
    (until === undefined || run.createdAt <= until)
  )
}
