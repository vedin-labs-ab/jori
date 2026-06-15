import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { type ExecutionFilter, executionMatchesFilter } from "./filters"
import { summarizeExecution } from "./summaries"

type ExecutionSummary = Awaited<ReturnType<typeof summarizeExecution>>

export async function pagePendingApprovals(
  ctx: QueryCtx,
  args: {
    executionFilter: ExecutionFilter
    query: string
    tenantId: string
    paginationOpts: {
      cursor: string | null
      numItems: number
    }
  }
) {
  const offset = parseCursor(args.paginationOpts.cursor)
  const normalizedQuery = normalizeQuery(args.query)
  const rows: ExecutionSummary[] = []
  const now = Date.now()
  let matchingIndex = 0
  let hasMore = false

  for await (const { approval, execution } of pendingApprovalExecutions(ctx, {
    executionFilter: args.executionFilter,
    now,
    tenantId: args.tenantId,
  })) {
    const summary = await summarizeExecution(ctx, execution, approval)

    if (!matchesSearch(summary, normalizedQuery)) {
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
    executionFilter: ExecutionFilter
    normalizedQuery: string
    tenantId: string
  }
) {
  const now = Date.now()
  let count = 0

  for await (const { approval, execution } of pendingApprovalExecutions(ctx, {
    executionFilter: args.executionFilter,
    now,
    tenantId: args.tenantId,
  })) {
    if (args.normalizedQuery === "") {
      count += 1
      continue
    }

    const summary = await summarizeExecution(ctx, execution, approval)

    if (matchesSearch(summary, args.normalizedQuery)) {
      count += 1
    }
  }

  return count
}

async function* pendingApprovalExecutions(
  ctx: QueryCtx,
  args: {
    executionFilter: ExecutionFilter
    now: number
    tenantId: string
  }
) {
  const seenExecutionIds = new Set<string>()
  const approvals = pendingApprovalQuery(ctx, args.tenantId, args.now)

  for await (const approval of approvals) {
    if (
      !isPendingApproval(approval, args.now) ||
      seenExecutionIds.has(approval.executionId)
    ) {
      continue
    }

    const execution = await ctx.db.get(approval.executionId)

    if (execution === null || execution.tenantId !== args.tenantId) {
      continue
    }

    seenExecutionIds.add(execution._id)

    if (executionMatchesFilter(execution, args.executionFilter)) {
      yield { approval, execution }
    }
  }
}

function pendingApprovalQuery(ctx: QueryCtx, tenantId: string, now: number) {
  return ctx.db
    .query("approvals")
    .withIndex("by_tenant_and_expires_at", (index) =>
      index.eq("tenantId", tenantId).gt("expiresAt", now)
    )
    .order("asc")
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

function matchesSearch(summary: ExecutionSummary, normalizedQuery: string) {
  return (
    normalizedQuery === "" || summary.searchableText.includes(normalizedQuery)
  )
}

function isPendingApproval(approval: Doc<"approvals">, now: number) {
  return (
    approval.consumedAt === undefined &&
    approval.decision === undefined &&
    approval.expiresAt > now
  )
}
