import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { canSeeRun } from "../visibility"
import {
  countMatches,
  normalizeQuery,
  parseCursor,
  type RunAudienceFilter,
  type RunFilter,
  runMatchesAudienceFilter,
  runMatchesFilter,
  scanPage,
  summaryMatchesSearch,
} from "./filters"
import { summarizeRun } from "./summaries"

/** Whose pending approvals, under which facets: the runs a person may
 *  see, of one job or the whole organization. */
export type PendingApprovalScope = {
  personId: Id<"persons"> | undefined
  runFilter: RunFilter
  audienceFilter: RunAudienceFilter
  organizationId: string
  jobId?: Id<"jobs">
}

export async function pagePendingApprovals(
  ctx: QueryCtx,
  args: PendingApprovalScope & {
    query: string
    paginationOpts: {
      cursor: string | null
      numItems: number
    }
  }
) {
  const normalizedQuery = normalizeQuery(args.query)

  return await scanPage(pendingApprovalRuns(ctx, args), {
    offset: parseCursor(args.paginationOpts.cursor),
    numItems: args.paginationOpts.numItems,
    match: async ({ approval, run }) => {
      if (normalizedQuery === "") {
        return {}
      }

      const summary = await summarizeRun(ctx, run, args.personId, approval)

      return summaryMatchesSearch(summary, normalizedQuery)
        ? { row: summary }
        : null
    },
    row: ({ approval, run }) => summarizeRun(ctx, run, args.personId, approval),
  })
}

export async function countPendingApprovals(
  ctx: QueryCtx,
  args: PendingApprovalScope & { normalizedQuery: string }
) {
  return await countMatches(
    pendingApprovalRuns(ctx, args),
    async ({ approval, run }) =>
      args.normalizedQuery === "" ||
      summaryMatchesSearch(
        await summarizeRun(ctx, run, args.personId, approval),
        args.normalizedQuery
      )
  )
}

async function* pendingApprovalRuns(
  ctx: QueryCtx,
  scope: PendingApprovalScope
) {
  const seenRunIds = new Set<string>()
  const approvals = pendingApprovalQuery(ctx, scope.organizationId, Date.now())

  for await (const approval of approvals) {
    if (approval.status !== "pending" || seenRunIds.has(approval.runId)) {
      continue
    }

    const run = await ctx.db.get(approval.runId)

    if (
      run === null ||
      run.organizationId !== scope.organizationId ||
      (scope.jobId !== undefined && run.job?.id !== scope.jobId) ||
      isTerminalRunStatus(run.status)
    ) {
      continue
    }

    seenRunIds.add(run._id)

    if (
      (await canSeeRun(ctx, run, scope.personId)) &&
      runMatchesAudienceFilter(run, scope.audienceFilter) &&
      runMatchesFilter(run, scope.runFilter)
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
