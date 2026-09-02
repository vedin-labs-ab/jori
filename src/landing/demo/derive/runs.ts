import {
  type AudienceFilter,
  matchesAudienceFilter,
} from "@/shared/console/list/audience"
import {
  type ApprovalFilter,
  type ExecutionItem,
  type RunFilter,
} from "@/shared/console/runs/types"

export type RunFilters = {
  approvalFilter: ApprovalFilter
  audienceFilter: AudienceFilter
  query: string
  runFilter: RunFilter
}

/** The Activity page's filters over the workspace's runs, the way the
 *  backend narrows its page. */
export function filterRuns(
  runs: ExecutionItem[],
  filters: RunFilters,
  now: number
) {
  const query = filters.query.trim().toLowerCase()

  return runs.filter(
    (run) =>
      matchesRunFilter(run, filters.runFilter) &&
      matchesApprovalFilter(run, filters.approvalFilter, now) &&
      matchesAudienceFilter(run.audience, filters.audienceFilter) &&
      (query === "" || run.searchableText.includes(query))
  )
}

export function hasRunFilters(filters: RunFilters) {
  return (
    filters.runFilter !== "all" ||
    filters.approvalFilter !== "any" ||
    filters.audienceFilter !== "all" ||
    filters.query.trim() !== ""
  )
}

function matchesRunFilter(run: ExecutionItem, filter: RunFilter) {
  if (filter === "all") {
    return true
  }

  if (filter === "ongoing") {
    return run.status === "queued" || run.status === "running"
  }

  return run.status === filter
}

function matchesApprovalFilter(
  run: ExecutionItem,
  filter: ApprovalFilter,
  now: number
) {
  if (filter === "any") {
    return true
  }

  if (filter === "none") {
    return run.approvals.length === 0
  }

  return run.approvals.some((approval) => {
    const state =
      approval.state === "pending" && approval.expiresAt <= now
        ? "expired"
        : approval.state

    return state === filter
  })
}
