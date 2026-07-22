import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { isTerminalRunStatus } from "../schema"
import {
  normalizeQuery,
  parseCursor,
  type RunFilter,
  type RunScopeFilter,
  runMatchesFilter,
  runMatchesScopeFilter,
  runVisibleToPerson,
  summaryMatchesSearch,
} from "./filters"
import { type RunSummary, summarizeRun } from "./summaries"

export async function pagePendingApprovals(
  ctx: QueryCtx,
  args: {
    personId: Id<"persons"> | undefined
    runFilter: RunFilter
    scopeFilter: RunScopeFilter
    query: string
    organizationId: string
    paginationOpts: {
      cursor: string | null
      numItems: number
    }
  }
) {
  const offset = parseCursor(args.paginationOpts.cursor)
  const normalizedQuery = normalizeQuery(args.query)
  const rows: RunSummary[] = []
  const now = Date.now()
  let matchingIndex = 0
  let hasMore = false

  for await (const { approval, run } of pendingApprovalRuns(ctx, {
    now,
    personId: args.personId,
    runFilter: args.runFilter,
    scopeFilter: args.scopeFilter,
    organizationId: args.organizationId,
  })) {
    const summary = await summarizeRun(ctx, run, args.personId, approval)

    if (!summaryMatchesSearch(summary, normalizedQuery)) {
      continue
    }

    if (matchingIndex < offset) {
      matchingIndex += 1
      continue
    }

    if (rows.length >= args.paginationOpts.numItems) {
      hasMore = true
      break
    }

    rows.push(summary)
    matchingIndex += 1
  }

  return {
    continueCursor: String(offset + rows.length),
    isDone: !hasMore,
    page: rows,
  }
}

export async function countPendingApprovals(
  ctx: QueryCtx,
  args: {
    normalizedQuery: string
    personId: Id<"persons"> | undefined
    runFilter: RunFilter
    scopeFilter: RunScopeFilter
    organizationId: string
  }
) {
  const now = Date.now()
  let count = 0

  for await (const { approval, run } of pendingApprovalRuns(ctx, {
    now,
    personId: args.personId,
    runFilter: args.runFilter,
    scopeFilter: args.scopeFilter,
    organizationId: args.organizationId,
  })) {
    if (args.normalizedQuery === "") {
      count += 1
      continue
    }

    const summary = await summarizeRun(ctx, run, args.personId, approval)

    if (summaryMatchesSearch(summary, args.normalizedQuery)) {
      count += 1
    }
  }

  return count
}

async function* pendingApprovalRuns(
  ctx: QueryCtx,
  args: {
    now: number
    personId: Id<"persons"> | undefined
    runFilter: RunFilter
    scopeFilter: RunScopeFilter
    organizationId: string
  }
) {
  const seenRunIds = new Set<string>()
  const approvals = pendingApprovalQuery(ctx, args.organizationId, args.now)

  for await (const approval of approvals) {
    if (
      !isPendingApproval(approval, args.now) ||
      seenRunIds.has(approval.runId)
    ) {
      continue
    }

    const run = await ctx.db.get(approval.runId)

    if (
      run === null ||
      run.organizationId !== args.organizationId ||
      isTerminalRunStatus(run.status)
    ) {
      continue
    }

    seenRunIds.add(run._id)

    if (
      runVisibleToPerson(run, args.personId) &&
      runMatchesScopeFilter(run, args.scopeFilter) &&
      runMatchesFilter(run, args.runFilter)
    ) {
      yield { approval, run }
    }
  }
}

function pendingApprovalQuery(
  ctx: QueryCtx,
  organizationId: string,
  now: number
) {
  return ctx.db
    .query("approvals")
    .withIndex("by_organization_and_expires_at", (index) =>
      index.eq("organizationId", organizationId).gt("expiresAt", now)
    )
    .order("asc")
}

function isPendingApproval(approval: Doc<"approvals">, now: number) {
  return approval.status === "pending" && approval.expiresAt > now
}
