import { expect, test } from "vitest"
import { activityData, traceDoc } from "../../../../test/convex/console"
import { projectActivity } from "../project"
import { type ToolResult } from "../read"

test("projects search run metadata without identifiers", () => {
  const items = projectActivity(
    activityData({
      traces: [
        toolStarted("search_runs", {
          limit: 10,
          mode: "search",
          query: "billing bug",
          scope: "conversation",
          source: "slack",
          status: "completed",
        }),
        toolCompleted("search_runs", result("runs", 4)),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      metadata: [
        { kind: "scope", text: "conversation" },
        { kind: "target", text: '"billing bug"' },
        { kind: "filter", text: "completed" },
        { kind: "filter", text: "Slack" },
        { kind: "outcome", text: "4 runs" },
      ],
      title: "Search Runs",
    })
  )
})

test("projects searched runs with compact time and paginated outcome", () => {
  const items = projectActivity(
    activityData({
      traces: [
        toolStarted("search_runs", {
          mode: "search",
          scope: "organization",
          since: Date.UTC(2026, 6, 1),
        }),
        toolCompleted("search_runs", result("runs", 10, true)),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      metadata: [
        { kind: "scope", text: "organization" },
        { kind: "target", text: "since Jul 1" },
        { kind: "outcome", text: "10+ runs" },
      ],
      title: "Search Runs",
    })
  )
})

test("projects no-match searched runs as recent runs", () => {
  const items = projectActivity(
    activityData({
      traces: [
        toolStarted("search_runs", {
          mode: "search",
          scope: "conversation",
        }),
        toolCompleted("search_runs", result("runs", 0)),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      metadata: [
        { kind: "scope", text: "conversation" },
        { kind: "target", text: "recent runs" },
        { kind: "outcome", text: "no matches" },
      ],
      title: "Search Runs",
    })
  )
})

test("projects legacy search sentinels as absent values", () => {
  const items = projectActivity(
    activityData({
      traces: [
        toolStarted("search_runs", {
          query: "",
          scope: "conversation",
          since: 0,
          until: 0,
        }),
        toolCompleted("search_runs", result("runs", 0)),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      metadata: [
        { kind: "scope", text: "conversation" },
        { kind: "target", text: "recent runs" },
        { kind: "outcome", text: "no matches" },
      ],
      title: "Search Runs",
    })
  )
})

test("projects explored run metadata without navigation details", () => {
  const items = projectActivity(
    activityData({
      traces: [
        toolStarted("search_runs", {
          mode: "tree",
          rootId: "hidden-run-id",
        }),
        toolCompleted("search_runs", result("runs", 0)),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      metadata: [
        { kind: "target", text: "explored runs" },
        { kind: "outcome", text: "none found" },
      ],
      title: "Search Runs",
    })
  )
})

test("projects search run activity metadata without run ids", () => {
  const items = projectActivity(
    activityData({
      traces: [
        toolStarted("search_run_activity", {
          filter: ["tool", "model"],
          runId: "hidden-run-id",
        }),
        toolCompleted("search_run_activity", result("items", 20, true)),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      metadata: [
        { kind: "target", text: "tools + models" },
        { kind: "outcome", text: "20+ events" },
      ],
      title: "Search Run Activity",
    })
  )
})

function result(
  itemKey: "items" | "runs",
  itemCount: number,
  hasMore = false
): ToolResult {
  return { hasMore, itemCount, itemKey, kind: "object", size: 2 }
}

function toolCompleted(name: string, traceResult: ToolResult) {
  return traceDoc({
    callId: "call-1",
    data: {
      provider: null,
      result: traceResult,
      tool: { access: "read", name, route: "convex" },
    },
    timestamp: 24,
    type: "tool.completed",
  })
}

function toolStarted(name: string, input: Record<string, unknown>) {
  return traceDoc({
    callId: "call-1",
    data: {
      input,
      tool: { access: "read", name, route: "convex" },
    },
    timestamp: 10,
    type: "tool.started",
  })
}
