import { getActorDisplayName } from "../../shared/actor"
import { type SlackApprovalDecisionResult } from "../runtime"

export function createDecisionTitle(
  result: SlackApprovalDecisionResult,
  args: {
    fallbackActor?: string
    surface?: "milo"
  } = {}
) {
  const title = getDecisionTitle(result.status, result.approval?.decision)

  if (!isDecisionStatus(result.status, result.approval?.decision)) {
    return title
  }

  const actor =
    getActorDisplayName(result.approval?.decidedBy) ??
    args.fallbackActor ??
    "unknown user"
  const surface = args.surface === "milo" ? " in Milo" : ""

  return `${title} by ${actor}${surface}`
}

export function getDecisionIcon(
  status: SlackApprovalDecisionResult["status"],
  decision?: "approved" | "denied"
) {
  if (status === "denied" || decision === "denied") {
    return "thumbs-down"
  }

  if (status === "closed" || status === "expired") {
    return "archive"
  }

  return "check"
}

function getDecisionTitle(
  status: SlackApprovalDecisionResult["status"],
  decision?: "approved" | "denied"
) {
  if (status === "approved" || decision === "approved") {
    return "Approved"
  }

  if (status === "denied" || decision === "denied") {
    return "Denied"
  }

  if (status === "expired") {
    return "Request expired"
  }

  if (status === "closed") {
    return "Run closed"
  }

  return "Approval unavailable"
}

function isDecisionStatus(
  status: SlackApprovalDecisionResult["status"],
  decision?: "approved" | "denied"
) {
  return (
    status === "approved" ||
    status === "denied" ||
    decision === "approved" ||
    decision === "denied"
  )
}
