import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { boundedNumber, optionalString } from "../../shared/input"
import { type ActivityItem } from "../activity/types"
import {
  matchesSummaryQuery,
  projectRunSummary,
  type RunSummary,
} from "../view/summary"
import { canSee } from "./access"
import {
  compareRuns,
  isAfterCursor,
  nextRunCursor,
  readRunCursor,
  runSearchKey,
} from "./cursor"
import { uniqueRuns } from "./runs"
import { type SearchRunsArgs } from "./schema"

type RunFilters = Omit<SearchRunsArgs, "cursor" | "limit"> & {
  candidates: Doc<"runs">[]
  current: Doc<"runs">
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
  if (filters.mode === "ids" && args.cursor !== undefined) {
    throw new Error("Invalid search_runs cursor: IDs mode is not paginated")
  }

  const search = runSearchKey(filters.current, filters)
  const cursor = readRunCursor(args.cursor, search)
  const runs = matchingRuns(filters).filter((run) => isAfterCursor(run, cursor))
  const limit =
    filters.mode === "ids" ? 50 : boundedNumber(args.limit, 15, 1, 50)

  if (filters.query === undefined) {
    return {
      cursor:
        filters.mode === "ids" ? null : nextRunCursor(runs, limit, search),
      runs: await projectRunSummaries(ctx, runs.slice(0, limit)),
    }
  }

  const matches = await projectMatchingSummaries(
    ctx,
    runs,
    filters.query,
    limit
  )
  return {
    cursor:
      filters.mode === "ids"
        ? null
        : nextRunCursor(
            matches.map((match) => match.run),
            limit,
            search
          ),
    runs: matches.slice(0, limit).map((match) => match.summary),
  }
}

function matchingRuns(filters: RunFilters) {
  return uniqueRuns(filters.candidates)
    .filter((run) => matchesRun(filters.current, run, filters))
    .sort(compareRuns)
}

async function projectMatchingSummaries(
  ctx: QueryCtx,
  runs: Doc<"runs">[],
  query: string,
  limit: number
) {
  const matches: { run: Doc<"runs">; summary: RunSummary }[] = []

  for (const run of runs) {
    const summary = await projectRunSummary(ctx, run)

    if (matchesSummaryQuery(summary, query)) {
      matches.push({ run, summary })
      if (matches.length > limit) {
        break
      }
    }
  }

  return matches
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

  return source === "job"
    ? run.snapshot.source.type === "job"
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
