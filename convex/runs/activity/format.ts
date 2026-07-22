import { type Doc } from "../../_generated/dataModel"
import { optionalString } from "../../shared/input"
import { type ActivityDetail } from "./types"

const visibleInputKeys = [
  "args",
  "command",
  "commentId",
  "cwd",
  "directory",
  "eventId",
  "fileId",
  "include",
  "issueId",
  "name",
  "owner",
  "pageId",
  "path",
  "pattern",
  "q",
  "query",
  "ref",
  "repo",
  "subject",
  "threadId",
  "timeoutMs",
  "title",
  "to",
  "url",
]

export function agentTitle(status: Doc<"runs">["status"]) {
  if (status === "queued") {
    return "Agent queued"
  }

  return status === "running" ? "Agent running" : `Agent ${status}`
}

export function approvalTitle(status: Doc<"approvals">["status"]) {
  if (status === "pending") {
    return "Waiting for approval"
  }

  return status === "approved" ? "Action approved" : `Approval ${status}`
}

function fieldLabel(value: string) {
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

export function inputDescription(input: Record<string, unknown> | undefined) {
  if (input === undefined) {
    return undefined
  }

  return (
    optionalString(input.command) ??
    stringArrayField(input.args) ??
    optionalString(input.pattern) ??
    optionalString(input.path) ??
    optionalString(input.directory) ??
    optionalString(input.repo) ??
    optionalString(input.query) ??
    optionalString(input.q) ??
    optionalString(input.url) ??
    optionalString(input.subject)
  )
}

export function inputDetails(
  input: Record<string, unknown> | undefined
): ActivityDetail[] {
  if (input === undefined) {
    return []
  }

  return visibleInputKeys.flatMap((key) => {
    const detail = detailValue(input[key])

    return detail === undefined
      ? []
      : [{ label: fieldLabel(key), value: detail }]
  })
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
      return "Wait cancelled"
    case "expired":
      return "Wait expired"
    case "message":
      return "New input arrived"
    case "resolved":
      return "Handoff resolved"
  }
}

function detailValue(value: unknown) {
  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number") {
    return String(value)
  }

  return Array.isArray(value) ? stringArrayField(value) : undefined
}

function stringArrayField(value: unknown) {
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
    ? value.join(" ")
    : undefined
}
