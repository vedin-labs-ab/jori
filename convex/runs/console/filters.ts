import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { scopeValidator } from "../../shared/audience"

export type RunFilter = "all" | "ongoing" | "failed" | "stopped" | "completed"

export type ApprovalFilter =
  | "any"
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "none"

export type ApprovalState =
  | "pending"
  | "approved"
  | "denied"
  | "cancelled"
  | "expired"
  | "failed"

export const runFilterValidator = v.union(
  v.literal("all"),
  v.literal("ongoing"),
  v.literal("failed"),
  v.literal("stopped"),
  v.literal("completed")
)

export type RunScopeFilter = "all" | "personal" | "organization"

export const scopeFilterValidator = v.union(v.literal("all"), scopeValidator)

export const approvalFilterValidator = v.union(
  v.literal("any"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("denied"),
  v.literal("expired"),
  v.literal("none")
)

/**
 * The console shows organization runs to everyone; personal and
 * conversation-scoped runs only to their creator. Ownerless rows stay open.
 */
export function runVisibleToPerson(
  run: Doc<"runs">,
  personId: Id<"persons"> | undefined
) {
  const scope = run.scope ?? "person"

  return (
    scope === "tenant" ||
    run.createdBy === undefined ||
    run.createdBy === personId
  )
}

/** Personal/organization facet over the internal run audience scope. */
export function runMatchesScopeFilter(
  run: Doc<"runs">,
  filter: RunScopeFilter
) {
  if (filter === "all") {
    return true
  }

  const isOrganization = (run.scope ?? "person") === "tenant"

  return filter === "organization" ? isOrganization : !isOrganization
}

export function runMatchesFilter(run: Doc<"runs">, filter: RunFilter) {
  if (filter === "all") {
    return true
  }

  if (filter === "ongoing") {
    return run.status === "queued" || run.status === "running"
  }

  return run.status === filter
}

export function approvalMatchesFilter(
  approvalState: ApprovalState | undefined,
  filter: ApprovalFilter
) {
  if (filter === "any") {
    return true
  }

  if (filter === "none") {
    return approvalState === undefined
  }

  return approvalState === filter
}

export function parseCursor(cursor: string | null) {
  if (cursor === null) {
    return 0
  }

  const parsed = Number.parseInt(cursor, 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function normalizeQuery(query: string) {
  return query.trim().toLowerCase()
}

export function summaryMatchesSearch(
  summary: { searchableText: string },
  normalizedQuery: string
) {
  return (
    normalizedQuery === "" || summary.searchableText.includes(normalizedQuery)
  )
}
