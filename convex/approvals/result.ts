import { type Doc } from "../_generated/dataModel"

export type ApprovalDecisionStatus =
  | "approved"
  | "cancelled"
  | "closed"
  | "decided"
  | "denied"
  | "expired"
  | "failed"
  | "missing"

export type ApprovalDecisionResult = {
  status: ApprovalDecisionStatus
  message: string
  integration?: Doc<"integrations">
  approval?: Doc<"approvals">
}

export function approvalDecisionMessage(
  status: ApprovalDecisionStatus,
  approval?: Doc<"approvals">
) {
  if (status === "approved") {
    return "Approved. Milo is continuing the run."
  }

  if (status === "denied") {
    return "Denied. Milo is continuing without this action."
  }

  if (status === "closed") {
    return "This run is no longer active."
  }

  if (status === "expired") {
    return "That approval request has expired."
  }

  if (status === "failed") {
    return "That approval request failed before it could be delivered."
  }

  if (status === "cancelled") {
    return "This request was cancelled."
  }

  if (status === "decided") {
    return alreadySettledMessage(approval)
  }

  return "That approval request no longer exists."
}

function alreadySettledMessage(approval?: Doc<"approvals">) {
  if (approval?.status === "approved") {
    return "This request was already approved."
  }

  if (approval?.status === "denied") {
    return "This request was already denied."
  }

  if (approval?.status === "cancelled") {
    return "This request was cancelled."
  }

  if (approval?.status === "failed") {
    return "This request failed before it could be delivered."
  }

  return "This request was already decided."
}
