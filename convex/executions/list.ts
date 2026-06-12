import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type QueryCtx, query } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import {
  type ApprovalFilter,
  approvalFilterValidator,
  approvalMatchesFilter,
  executionFilterValidator,
  executionMatchesFilter,
} from "./filters"
import { countPendingApprovals, pagePendingApprovals } from "./pending"
import { summarizeExecution } from "./summaries"

type ExecutionSummary = Awaited<ReturnType<typeof summarizeExecution>>

export const page = query({
  args: {
    approvalFilter: approvalFilterValidator,
    executionFilter: executionFilterValidator,
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
    const rows: ExecutionSummary[] = []
    let matchingIndex = 0
    let hasMore = false
    const executions = ctx.db
      .query("executions")
      .withIndex("by_tenant", (index) => index.eq("tenantId", args.tenantId))
      .order("desc")

    const shouldMatchSummary = needsSummary(
      args.approvalFilter,
      normalizedQuery
    )

    for await (const execution of executions) {
      if (!executionMatchesFilter(execution, args.executionFilter)) {
        continue
      }

      const summary = shouldMatchSummary
        ? await summarizeExecution(ctx, execution)
        : null

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

      rows.push(summary ?? (await summarizeExecution(ctx, execution)))
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
    executionFilter: executionFilterValidator,
    query: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const normalizedQuery = normalizeQuery(args.query)

    if (args.approvalFilter === "pending") {
      return {
        filteredCount: await countPendingApprovals(ctx, {
          executionFilter: args.executionFilter,
          normalizedQuery,
          tenantId: args.tenantId,
        }),
        totalCount: await countExecutions(ctx, args.tenantId),
      }
    }

    let filteredCount = 0
    let totalCount = 0
    const executions = ctx.db
      .query("executions")
      .withIndex("by_tenant", (index) => index.eq("tenantId", args.tenantId))
      .order("desc")

    for await (const execution of executions) {
      totalCount += 1

      if (!executionMatchesFilter(execution, args.executionFilter)) {
        continue
      }

      if (!needsSummary(args.approvalFilter, normalizedQuery)) {
        filteredCount += 1
        continue
      }

      const summary = await summarizeExecution(ctx, execution)

      if (matchesSummary(summary, args.approvalFilter, normalizedQuery)) {
        filteredCount += 1
      }
    }

    return { filteredCount, totalCount }
  },
})

async function countExecutions(ctx: QueryCtx, tenantId: string) {
  let count = 0
  const executions = ctx.db
    .query("executions")
    .withIndex("by_tenant", (index) => index.eq("tenantId", tenantId))

  for await (const _execution of executions) {
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
  summary: ExecutionSummary,
  filter: ApprovalFilter,
  normalizedQuery: string
) {
  if (!approvalMatchesFilter(summary.approval?.state, filter)) {
    return false
  }

  return (
    normalizedQuery === "" || summary.searchableText.includes(normalizedQuery)
  )
}
