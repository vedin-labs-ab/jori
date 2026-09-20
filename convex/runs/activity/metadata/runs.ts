import { optionalString } from "../../../shared/input"
import { type ToolResult } from "../../execution/traces/schema"
import { item } from "../helpers"
import {
  activityFilterLabel,
  countOutcome,
  foundOutcome,
  sourceLabel,
  timeWindow,
} from "./labels"

export function runIntrospectionMetadata(
  tool: string,
  input: Record<string, unknown> | undefined,
  result: ToolResult | undefined
) {
  if (input === undefined) {
    return []
  }

  if (tool === "search_runs") {
    return searchRunsMetadata(input, result)
  }

  return tool === "search_run_activity"
    ? searchRunActivityMetadata(input, result)
    : []
}

function searchRunsMetadata(
  input: Record<string, unknown>,
  result: ToolResult | undefined
) {
  const isSearch = searchRunsMode(input) === "search"
  const outcome = isSearch
    ? countOutcome(result, "runs", "run", "no matches")
    : foundOutcome(result)

  if (!isSearch) {
    return [item("target", "explored runs"), item("outcome", outcome)]
  }

  return [
    item("scope", optionalString(input.scope) ?? "conversation"),
    item("target", searchRunsTarget(input)),
    item("filter", optionalString(input.status)),
    item("filter", sourceLabel(optionalString(input.source))),
    item("outcome", outcome),
  ]
}

function searchRunActivityMetadata(
  input: Record<string, unknown>,
  result: ToolResult | undefined
) {
  return [
    item("target", activityFilterLabel(input.filter)),
    item("outcome", countOutcome(result, "items", "event", "no events")),
  ]
}

function searchRunsTarget(input: Record<string, unknown>) {
  const query = optionalString(input.query)

  return query === undefined
    ? (timeWindow(input) ?? "recent runs")
    : `"${query}"`
}

function searchRunsMode(input: Record<string, unknown>) {
  const mode = optionalString(input.mode)

  if (mode !== undefined) {
    return mode
  }

  return hasSearchCriteria(input) ? "search" : "explore"
}

function hasSearchCriteria(input: Record<string, unknown>) {
  return (
    optionalString(input.query) !== undefined ||
    optionalString(input.scope) !== undefined ||
    optionalString(input.status) !== undefined ||
    optionalString(input.source) !== undefined ||
    timeWindow(input) !== undefined
  )
}
