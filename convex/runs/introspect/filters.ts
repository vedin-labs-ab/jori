import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { type ActivityItem } from "../activity/types"
import { canSee } from "./access"
import {
  matchesSummaryQuery,
  projectRunSummary,
  type RunSummary,
} from "./project"
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

export async function projectMatches(ctx: QueryCtx, filters: RunFilters) {
  const summaries: RunSummary[] = []

  for (const run of uniqueRuns(filters.candidates)) {
    if (!matchesRun(filters.current, run, filters)) {
      continue
    }

    const summary = await projectRunSummary(ctx, run)

    if (matchesSummaryQuery(summary, filters.query)) {
      summaries.push(summary)
    }
  }

  return summaries.sort((left, right) => right.startedAt - left.startedAt)
}

export function matchesActivityFilter(
  item: ActivityItem,
  filter:
    | ("agent" | "approval" | "asset" | "error" | "model" | "tool")[]
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
  const value = query?.trim().toLowerCase()

  return value === "" ? undefined : value
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
