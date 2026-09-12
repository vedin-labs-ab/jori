import { v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import { conversationVisibility } from "../../conversations/access"
import { type QueryLikeCtx } from "../../shared/context"

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

/** The console's two-way audience facet: what a person keeps to themselves,
 *  and what the whole organization sees. */
export type RunAudienceFilter = "all" | "personal" | "organization"

export const audienceFilterValidator = v.union(
  v.literal("all"),
  v.literal("personal"),
  v.literal("organization")
)

export const approvalFilterValidator = v.union(
  v.literal("any"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("denied"),
  v.literal("expired"),
  v.literal("none")
)

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

/** The console's facet follows the chat's live personal/workspace setting. */
export async function runMatchesVisibilityFilter(
  ctx: QueryLikeCtx,
  run: Doc<"runs">,
  filter: RunAudienceFilter
) {
  if (filter === "all") {
    return true
  }
  const conversation =
    run.conversationId === undefined
      ? null
      : await ctx.db.get(run.conversationId)
  const shared =
    conversation?.surface === "console"
      ? conversationVisibility(conversation).mode !== "private"
      : run.audience === "organization"
  return filter === "organization" ? shared : !shared
}
