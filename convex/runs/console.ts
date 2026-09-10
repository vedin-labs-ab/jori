import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx, query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { resolveConsolePerson } from "../persons/account"
import {
  type ApprovalFilter,
  approvalFilterValidator,
  approvalMatchesFilter,
  audienceFilterValidator,
  countMatches,
  normalizeQuery,
  parseCursor,
  type RunAudienceFilter,
  type RunFilter,
  runFilterValidator,
  runMatchesAudienceFilter,
  runMatchesFilter,
  scanPage,
  summaryMatchesSearch,
} from "./console/filters"
import { countPendingApprovals, pagePendingApprovals } from "./console/pending"
import { type RunSummary, summarizeRun } from "./console/summaries"
import { canSeeRun } from "./visibility"

/** What the listing keeps: the runs a person may see, under the facets
 *  and search the page shows. */
type Listing = {
  approvalFilter: ApprovalFilter
  runFilter: RunFilter
  audienceFilter: RunAudienceFilter
  normalizedQuery: string
  personId: Id<"persons"> | undefined
}

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

    const listing = {
      ...args,
      normalizedQuery: normalizeQuery(args.query),
      personId,
    }

    return await scanPage(
      organizationRuns(ctx, args.organizationId, args.jobId),
      {
        offset: parseCursor(args.paginationOpts.cursor),
        numItems: args.paginationOpts.numItems,
        match: (run) => matchListing(ctx, run, listing),
        row: (run) => summarizeRun(ctx, run, personId),
      }
    )
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
    const listing = {
      ...args,
      normalizedQuery: normalizeQuery(args.query),
      personId,
    }
    const runs = () => organizationRuns(ctx, args.organizationId, args.jobId)

    return {
      filteredCount:
        args.approvalFilter === "pending"
          ? await countPendingApprovals(ctx, listing)
          : await countMatches(
              runs(),
              async (run) => (await matchListing(ctx, run, listing)) !== null
            ),
      totalCount: await countMatches(runs(), async (run) =>
        canSeeRun(ctx, run, personId)
      ),
    }
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

/** Whether a run belongs on the listing. The run's own fields decide
 *  first; only an approval facet or a search reads its summary, which a
 *  kept run then carries to the page. */
async function matchListing(
  ctx: QueryCtx,
  run: Doc<"runs">,
  listing: Listing
): Promise<{ row?: RunSummary } | null> {
  if (
    !(await canSeeRun(ctx, run, listing.personId)) ||
    !runMatchesAudienceFilter(run, listing.audienceFilter) ||
    !runMatchesFilter(run, listing.runFilter)
  ) {
    return null
  }

  if (listing.approvalFilter === "any" && listing.normalizedQuery === "") {
    return {}
  }

  const summary = await summarizeRun(ctx, run, listing.personId)

  return matchesApprovalFilter(summary, listing.approvalFilter) &&
    summaryMatchesSearch(summary, listing.normalizedQuery)
    ? { row: summary }
    : null
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
