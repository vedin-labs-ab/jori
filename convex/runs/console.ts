import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type QueryCtx, query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { resolveConsolePerson } from "../persons/account"
import {
  type ApprovalFilter,
  approvalFilterValidator,
  approvalMatchesFilter,
  audienceFilterValidator,
  normalizeQuery,
  parseCursor,
  runFilterValidator,
  runMatchesAudienceFilter,
  runMatchesFilter,
  runVisibleToPerson,
  summaryMatchesSearch,
} from "./console/filters"
import { countPendingApprovals, pagePendingApprovals } from "./console/pending"
import { type RunSummary, summarizeRun } from "./console/summaries"

export const page = query({
  args: {
    approvalFilter: approvalFilterValidator,
    runFilter: runFilterValidator,
    audienceFilter: audienceFilterValidator,
    query: v.string(),
    organizationId: v.string(),
    /** Set, the page is one job's runs alone. */
    jobId: v.optional(v.id("jobs")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await resolveConsolePerson(
      ctx,
      args.organizationId,
      identity
    )

    if (args.approvalFilter === "pending") {
      return await pagePendingApprovals(ctx, { ...args, personId })
    }

    const offset = parseCursor(args.paginationOpts.cursor)
    const normalizedQuery = normalizeQuery(args.query)
    const rows: RunSummary[] = []
    let matchingIndex = 0
    let hasMore = false
    const runs = organizationRuns(ctx, args.organizationId, args.jobId)

    const shouldMatchSummary = needsSummary(
      args.approvalFilter,
      normalizedQuery
    )

    for await (const run of runs) {
      if (
        !runVisibleToPerson(run, personId) ||
        !runMatchesAudienceFilter(run, args.audienceFilter) ||
        !runMatchesFilter(run, args.runFilter)
      ) {
        continue
      }

      const summary = shouldMatchSummary
        ? await summarizeRun(ctx, run, personId)
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

      rows.push(summary ?? (await summarizeRun(ctx, run, personId)))
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
    audienceFilter: audienceFilterValidator,
    query: v.string(),
    organizationId: v.string(),
    jobId: v.optional(v.id("jobs")),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await resolveConsolePerson(
      ctx,
      args.organizationId,
      identity
    )

    const normalizedQuery = normalizeQuery(args.query)

    if (args.approvalFilter === "pending") {
      return {
        filteredCount: await countPendingApprovals(ctx, {
          runFilter: args.runFilter,
          audienceFilter: args.audienceFilter,
          normalizedQuery,
          personId,
          organizationId: args.organizationId,
          jobId: args.jobId,
        }),
        totalCount: await countRuns(ctx, args, personId),
      }
    }

    let filteredCount = 0
    let totalCount = 0
    const runs = organizationRuns(ctx, args.organizationId, args.jobId)

    for await (const run of runs) {
      if (!runVisibleToPerson(run, personId)) {
        continue
      }

      totalCount += 1

      if (
        !runMatchesAudienceFilter(run, args.audienceFilter) ||
        !runMatchesFilter(run, args.runFilter)
      ) {
        continue
      }

      if (!needsSummary(args.approvalFilter, normalizedQuery)) {
        filteredCount += 1
        continue
      }

      const summary = await summarizeRun(ctx, run, personId)

      if (matchesSummary(summary, args.approvalFilter, normalizedQuery)) {
        filteredCount += 1
      }
    }

    return { filteredCount, totalCount }
  },
})

/** The organization's runs newest first, or one job's when asked. */
function organizationRuns(
  ctx: QueryCtx,
  organizationId: string,
  jobId: Id<"jobs"> | undefined
) {
  const runs = ctx.db.query("runs")
  const indexed =
    jobId === undefined
      ? runs.withIndex("by_organization", (index) =>
          index.eq("organizationId", organizationId)
        )
      : runs.withIndex("by_organization_and_job_and_created_at", (index) =>
          index.eq("organizationId", organizationId).eq("job.id", jobId)
        )

  return indexed.order("desc")
}

async function countRuns(
  ctx: QueryCtx,
  args: { organizationId: string; jobId?: Id<"jobs"> },
  personId: Id<"persons"> | undefined
) {
  let count = 0
  const runs = organizationRuns(ctx, args.organizationId, args.jobId)

  for await (const run of runs) {
    if (runVisibleToPerson(run, personId)) {
      count += 1
    }
  }

  return count
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

  return summaryMatchesSearch(summary, normalizedQuery)
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
