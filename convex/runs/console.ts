import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type QueryCtx, query } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import {
  type ApprovalFilter,
  approvalFilterValidator,
  approvalMatchesFilter,
  runFilterValidator,
  runMatchesFilter,
} from "./console/filters"
import { countPendingApprovals, pagePendingApprovals } from "./console/pending"
import { summarizeRun } from "./console/summaries"

type RunSummary = Awaited<ReturnType<typeof summarizeRun>>

export const page = query({
  args: {
    approvalFilter: approvalFilterValidator,
    runFilter: runFilterValidator,
    query: v.string(),
    tenantId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    if (args.approvalFilter === "pending") {
      return await pagePendingApprovals(ctx, args)
    }

    const offset = parseCursor(args.paginationOpts.cursor)
    const normalizedQuery = normalizeQuery(args.query)
    const rows: RunSummary[] = []
    let matchingIndex = 0
    let hasMore = false
    const runs = ctx.db
      .query("runs")
      .withIndex("by_tenant", (index) => index.eq("tenantId", args.tenantId))
      .order("desc")

    const shouldMatchSummary = needsSummary(
      args.approvalFilter,
      normalizedQuery
    )

    for await (const run of runs) {
      if (!runMatchesFilter(run, args.runFilter)) {
        continue
      }

      const summary = shouldMatchSummary ? await summarizeRun(ctx, run) : null

      if (
        summary !== null &&
        !matchesSummary(summary, args.approvalFilter, normalizedQuery)
      ) {
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

      rows.push(summary ?? (await summarizeRun(ctx, run)))
      matchingIndex += 1
    }

    return {
      continueCursor: String(offset + rows.length),
      isDone: !hasMore,
      page: rows,
    }
  },
})

export const stats = query({
  args: {
    approvalFilter: approvalFilterValidator,
    runFilter: runFilterValidator,
    query: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const normalizedQuery = normalizeQuery(args.query)

    if (args.approvalFilter === "pending") {
      return {
        filteredCount: await countPendingApprovals(ctx, {
          runFilter: args.runFilter,
          normalizedQuery,
          tenantId: args.tenantId,
        }),
        totalCount: await countRuns(ctx, args.tenantId),
      }
    }

    let filteredCount = 0
    let totalCount = 0
    const runs = ctx.db
      .query("runs")
      .withIndex("by_tenant", (index) => index.eq("tenantId", args.tenantId))
      .order("desc")

    for await (const run of runs) {
      totalCount += 1

      if (!runMatchesFilter(run, args.runFilter)) {
        continue
      }

      if (!needsSummary(args.approvalFilter, normalizedQuery)) {
        filteredCount += 1
        continue
      }

      const summary = await summarizeRun(ctx, run)

      if (matchesSummary(summary, args.approvalFilter, normalizedQuery)) {
        filteredCount += 1
      }
    }

    return { filteredCount, totalCount }
  },
})

async function countRuns(ctx: QueryCtx, tenantId: string) {
  let count = 0
  const runs = ctx.db
    .query("runs")
    .withIndex("by_tenant", (index) => index.eq("tenantId", tenantId))

  for await (const _run of runs) {
    count += 1
  }

  return count
}

function parseCursor(cursor: string | null) {
  if (cursor === null) {
    return 0
  }

  const parsed = Number.parseInt(cursor, 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function normalizeQuery(query: string) {
  return query.trim().toLowerCase()
}

function needsSummary(filter: ApprovalFilter, normalizedQuery: string) {
  return filter !== "any" || normalizedQuery !== ""
}

function matchesSummary(
  summary: RunSummary,
  filter: ApprovalFilter,
  normalizedQuery: string
) {
  if (!matchesApprovalFilter(summary, filter)) {
    return false
  }

  return (
    normalizedQuery === "" || summary.searchableText.includes(normalizedQuery)
  )
}

function matchesApprovalFilter(summary: RunSummary, filter: ApprovalFilter) {
  if (filter === "any") {
    return true
  }

  if (filter === "none") {
    return summary.approvals.length === 0
  }

  return summary.approvals.some((approval) =>
    approvalMatchesFilter(approval.state, filter)
  )
}
