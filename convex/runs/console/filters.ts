import { v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"

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

export const runFilterValidator = v.union(
  v.literal("all"),
  v.literal("ongoing"),
  v.literal("failed"),
  v.literal("stopped"),
  v.literal("completed")
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
