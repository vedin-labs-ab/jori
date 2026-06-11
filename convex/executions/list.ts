import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { type QueryCtx, query } from "../_generated/server"
import { requireTenantAccess } from "../skills/access"
import { countPendingApprovals, pagePendingApprovals } from "./pending"
import { summarizeExecution } from "./summaries"

type Filter = "all" | "ongoing" | "approval" | "failed" | "completed"
type ExecutionSummary = Awaited<ReturnType<typeof summarizeExecution>>

const filterValidator = v.union(
  v.literal("all"),
  v.literal("ongoing"),
  v.literal("approval"),
  v.literal("failed"),
  v.literal("completed")
)

export const page = query({
  args: {
    filter: filterValidator,
    query: v.string(),
    tenantId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    if (args.filter === "approval") {
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

    const shouldMatchSummary = needsSummary(args.filter, normalizedQuery)

    for await (const execution of executions) {
      if (!canMatchRawFilter(execution, args.filter)) {
        continue
      }

      const summary = shouldMatchSummary
        ? await summarizeExecution(ctx, execution)
        : null

      if (
        summary !== null &&
        !matchesSummary(summary, args.filter, normalizedQuery)
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
    filter: filterValidator,
    query: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const normalizedQuery = normalizeQuery(args.query)

    if (args.filter === "approval") {
      return {
        filteredCount: await countPendingApprovals(ctx, {
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

      if (!canMatchRawFilter(execution, args.filter)) {
        continue
      }

      if (!needsSummary(args.filter, normalizedQuery)) {
        filteredCount += 1
        continue
      }

      const summary = await summarizeExecution(ctx, execution)

      if (matchesSummary(summary, args.filter, normalizedQuery)) {
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

function canMatchRawFilter(execution: Doc<"executions">, filter: Filter) {
  if (filter === "all") {
    return true
  }

  if (filter === "ongoing") {
    return execution.status === "queued" || execution.status === "running"
  }

  if (filter === "approval") {
    return true
  }

  return execution.status === filter
}

function needsSummary(filter: Filter, normalizedQuery: string) {
  return filter === "approval" || normalizedQuery !== ""
}

function matchesSummary(
  summary: ExecutionSummary,
  filter: Filter,
  normalizedQuery: string
) {
  if (filter === "approval" && summary.approval?.state !== "pending") {
    return false
  }

  return (
    normalizedQuery === "" || summary.searchableText.includes(normalizedQuery)
  )
}
