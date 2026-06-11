import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"

export type ExecutionFilter =
  | "all"
  | "ongoing"
  | "failed"
  | "stopped"
  | "completed"

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
  | "expired"
  | "consumed"

export const executionFilterValidator = v.union(
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

export function executionMatchesFilter(
  execution: Doc<"executions">,
  filter: ExecutionFilter
) {
  if (filter === "all") {
    return true
  }

  if (filter === "ongoing") {
    return execution.status === "queued" || execution.status === "running"
  }

  return execution.status === filter
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

  if (filter === "approved") {
    return approvalState === "approved" || approvalState === "consumed"
  }

  return approvalState === filter
}
