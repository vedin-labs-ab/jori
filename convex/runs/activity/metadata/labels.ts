import { readStringArray } from "../../../../contracts/json"
import { optionalNumber } from "../../../shared/input"
import { type ToolResult } from "../read"

export function activityFilterLabel(value: unknown) {
  const filters = readStringArray(value)

  if (filters.length === 0) {
    return "all activity"
  }

  if (filters.length === 1) {
    return filters[0] === "error"
      ? "errors only"
      : `${activityFilterPlural(filters[0])} only`
  }

  return filters.map(activityFilterPlural).join(" + ")
}

export function countOutcome(
  result: ToolResult | undefined,
  itemKey: string,
  nounValue: string,
  empty: string
) {
  const count = resultCount(result, itemKey)

  if (count === undefined) {
    return undefined
  }

  if (count === 0) {
    return empty
  }

  return `${count}${hasMore(result)} ${count === 1 ? nounValue : `${nounValue}s`}`
}

export function foundOutcome(result: ToolResult | undefined) {
  const count = resultCount(result, "runs")

  if (count === undefined) {
    return undefined
  }

  return count === 0 ? "none found" : `${count}${hasMore(result)} found`
}

export function sourceLabel(value: string | undefined) {
  switch (value) {
    case "job":
      return "Job"
    case "jori":
      return "Jori"
    case "github":
      return "GitHub"
    case "linear":
      return "Linear"
    case "slack":
      return "Slack"
    default:
      return undefined
  }
}

export function timeWindow(input: Record<string, unknown>) {
  const since = readTimestamp(input.since)
  const until = readTimestamp(input.until)

  if (since === undefined) {
    return until === undefined ? undefined : `until ${dateLabel(until)}`
  }

  return until === undefined
    ? `since ${dateLabel(since)}`
    : `${dateLabel(since)}-${dateLabel(until)}`
}

function activityFilterPlural(value: string) {
  return value === "error" ? "errors" : `${value}s`
}

function dateLabel(value: number) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

function readTimestamp(value: unknown) {
  const timestamp = optionalNumber(value)

  return timestamp === undefined || timestamp <= 0 ? undefined : timestamp
}

function hasMore(result: ToolResult | undefined) {
  return result?.kind === "object" && result.hasMore === true ? "+" : ""
}

function resultCount(result: ToolResult | undefined, itemKey: string) {
  return result?.kind === "object" && result.itemKey === itemKey
    ? result.itemCount
    : undefined
}
