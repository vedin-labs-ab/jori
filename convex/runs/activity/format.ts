import { type Doc } from "../../_generated/dataModel"

export function agentTitle(status: Doc<"runs">["status"]) {
  if (status === "queued") {
    return "Agent queued"
  }

  return status === "running" ? "Agent running" : `Agent ${status}`
}

export function approvalTitle(status: Doc<"approvals">["status"]) {
  return status === "pending" ? "Waiting for approval" : `Approval ${status}`
}

export function fieldLabel(value: string) {
  return value
    .replace(/[A-Z]/g, (letter) => ` ${letter}`)
    .replace(/^./, (letter) => letter.toUpperCase())
}

export function formatToolName(name: string) {
  return name
    .split("_")
    .filter((part) => part !== "")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

export function offerTitle(status: Doc<"integrationOffers">["status"]) {
  if (status === "connected") {
    return "Integration connected"
  }

  return status === "pending" || status === "claimed"
    ? "Integration offered"
    : `Integration offer ${status}`
}

export function waiterReason(reason: NonNullable<Doc<"waiters">["reason"]>) {
  switch (reason) {
    case "cancelled":
      return "The wait was cancelled."
    case "expired":
      return "The wait expired."
    case "message":
      return "New requester input arrived."
    case "resolved":
      return "A pending handoff was resolved."
  }
}
