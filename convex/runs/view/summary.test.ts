import { expect, test } from "vitest"
import { runActivityKinds } from "../../../contracts/runtime/runs"
import { getToolResponseSchema } from "../../../contracts/tools/responses"
import { activityData, traceDoc } from "../../../test/convex/console"
import { id } from "../../../test/convex/database"
import { schemaViolations } from "../../../test/convex/schema"
import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { projectActivity } from "../activity/project"
import { projectRunSummary } from "./summary"

const ctx = { db: { get: async () => null } } as unknown as QueryCtx
const schema = getToolResponseSchema("search_runs")

test("projected lifecycle activity satisfies the search_run_activity contract", () => {
  const items = projectActivity(
    activityData({
      traces: [
        traceDoc({ timestamp: 1, type: "run.started" }),
        traceDoc({ timestamp: 2, type: "run.completed" }),
      ],
    })
  )
  expect(items.map((item) => item.kind)).toEqual(["run", "run"])
  expect(
    schemaViolations(
      { cursor: null, items },
      getToolResponseSchema("search_run_activity")
    )
  ).toEqual([])
})

test.each(runActivityKinds)(
  "activity contract accepts the canonical %s kind",
  (kind) => {
    const items = [
      {
        id: "synthetic",
        kind,
        status: "completed",
        title: "Synthetic activity",
        startedAt: 1,
      },
    ]
    expect(
      schemaViolations(
        { cursor: null, items },
        getToolResponseSchema("search_run_activity")
      )
    ).toEqual([])
  }
)

test("activity contract rejects an unknown kind", () => {
  expect(
    schemaViolations(
      { cursor: null, items: [{ kind: "unknown" }] },
      getToolResponseSchema("search_run_activity")
    )
  ).not.toEqual([])
})

test.each([
  { source: { type: "manual" }, cause: { type: "manual" } },
  { source: { type: "job" }, cause: { type: "time", scheduledAt: 10 } },
  {
    source: { type: "message", surface: "jori" },
    cause: {
      type: "message",
      messageId: id<"messages">("message"),
      kind: "mention",
    },
  },
  {
    source: {
      type: "event",
      surface: "github",
      url: "https://example.com/issue",
    },
    cause: { type: "event", eventId: id<"events">("event") },
  },
] satisfies {
  source: Doc<"runs">["snapshot"]["source"]
  cause: Doc<"runs">["cause"]
}[])(
  "projected $source.type summary satisfies the search_runs response contract",
  async ({ source, cause }) => {
    const run = fixture()
    run.snapshot.source = source
    run.cause = cause
    const summary = await projectRunSummary(ctx, run)
    expect(summary.source).toEqual(source)
    expect(schemaViolations({ cursor: null, runs: [summary] }, schema)).toEqual(
      []
    )
  }
)

test.each([
  "manual",
  null,
  {},
  { type: "unknown" },
  { type: "manual", surface: "unknown" },
  { type: "job", url: 1 },
  { type: "manual", extra: true },
])("response contract rejects malformed run source %j", async (source) => {
  const summary = await projectRunSummary(ctx, fixture())
  expect(
    schemaViolations({ cursor: null, runs: [{ ...summary, source }] }, schema)
  ).not.toEqual([])
})

function fixture(): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    principal: { kind: "organization" },
    audience: "organization",
    cause: { type: "manual" },
    createdAt: 10,
    snapshot: {
      context: [],
      source: { type: "manual" },
      title: "Synthetic run",
    },
    status: "completed",
    endedAt: 20,
    organizationId: "organization",
  }
}
