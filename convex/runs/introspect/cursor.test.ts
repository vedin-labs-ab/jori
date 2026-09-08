import { expect, test } from "vitest"
import { id } from "../../../test/convex/database"
import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { pageRunMatches } from "./filters"
import { type SearchRunsArgs } from "./schema"

const ctx = {} as QueryCtx

test.each([
  48, 50,
])("IDs mode returns all %s visible runs without pagination", async (count) => {
  const visible = Array.from({ length: count }, (_, createdAt) =>
    run({
      _id: id<"runs">(`run-${createdAt}`),
      createdAt,
    })
  )
  const hidden = [
    run({ _id: id<"runs">("foreign"), organizationId: "other" }),
    run({ _id: id<"runs">("private"), audience: "person" }),
  ]
  const candidates = [...visible, ...hidden.slice(0, 50 - count)]
  const page = await pageRunMatches(
    ctx,
    search(candidates, {
      mode: "ids",
      runIds: candidates.map((candidate) => candidate._id),
    }),
    { limit: 1 }
  )
  expect(page.runs.map((item) => item.runId)).toEqual(
    [...visible].reverse().map((candidate) => candidate._id)
  )
  expect(page.cursor).toBeNull()
})

test("continues when the cursor run stops matching or is deleted", async () => {
  const candidates = [30, 20, 10].map((createdAt) =>
    run({
      _id: id<"runs">(`run-${createdAt}`),
      createdAt,
      status: "completed",
    })
  )
  const filters = search(candidates, { status: "completed" })
  const first = await pageRunMatches(ctx, filters, { limit: 1 })
  candidates[0].status = "failed"
  const second = await pageRunMatches(ctx, filters, {
    limit: 1,
    cursor: requiredCursor(first),
  })
  expect(second.runs.map((item) => item.runId)).toEqual([candidates[1]._id])
  filters.candidates = [candidates[2]]
  const third = await pageRunMatches(ctx, filters, {
    limit: 1,
    cursor: requiredCursor(second),
  })
  expect(third.runs.map((item) => item.runId)).toEqual([candidates[2]._id])
  expect(third.cursor).toBeNull()
})

test("orders equal timestamps consistently regardless of candidate order", async () => {
  const candidates = ["a", "c", "b"].map((value) =>
    run({ _id: id<"runs">(value), createdAt: 10 })
  )
  const filters = search([...candidates, candidates[0]])
  const first = await pageRunMatches(ctx, filters, { limit: 1 })
  expect(first.runs.map((item) => item.runId)).toEqual([id<"runs">("c")])
  filters.candidates.reverse()
  const second = await pageRunMatches(ctx, filters, {
    limit: 2,
    cursor: requiredCursor(first),
  })
  expect(second.runs.map((item) => item.runId)).toEqual([
    id<"runs">("b"),
    id<"runs">("a"),
  ])
  expect(second.cursor).toBeNull()
})

test.each([
  { scope: "all" },
  { mode: "children", parentId: "parent" },
  { mode: "tree", rootId: "root" },
  { mode: "ids", runIds: ["a"] },
  { query: "changed" },
  { source: "slack" },
  { status: "completed" },
  { since: 1 },
  { until: 100 },
] satisfies Partial<SearchRunsArgs>[])("rejects a cursor with changed selection or filters %j", async (changed) => {
  const filters = search([
    run({ _id: id<"runs">("a") }),
    run({ _id: id<"runs">("b") }),
  ])
  const first = await pageRunMatches(ctx, filters, { limit: 1 })
  await expect(
    pageRunMatches(
      ctx,
      { ...filters, ...changed },
      { cursor: requiredCursor(first) }
    )
  ).rejects.toThrow("Invalid search_runs cursor")
})

test.each([
  { organizationId: "other" },
  { audience: "person" },
  { createdBy: id<"persons">("person") },
  { conversationId: id<"conversations">("conversation") },
] satisfies Partial<
  Doc<"runs">
>[])("rejects a cursor from another visibility context %j", async (changed) => {
  const filters = search([
    run({ _id: id<"runs">("a") }),
    run({ _id: id<"runs">("b") }),
  ])
  const first = await pageRunMatches(ctx, filters, { limit: 1 })
  await expect(
    pageRunMatches(
      ctx,
      { ...filters, current: run(changed) },
      { cursor: requiredCursor(first) }
    )
  ).rejects.toThrow("Invalid search_runs cursor")
})

test.each([
  "",
  "1",
  "not-json",
  "null",
  "{}",
  "[]",
  '[0,"id"]',
  '[0,"id","wrong-search"]',
])("rejects malformed cursor %j", async (cursor) => {
  await expect(pageRunMatches(ctx, search([]), { cursor })).rejects.toThrow(
    "Invalid search_runs cursor"
  )
})

test.each([
  { limit: undefined, expected: 15 },
  { limit: 0, expected: 1 },
  { limit: -1, expected: 1 },
  { limit: 2.9, expected: 2 },
  { limit: 100, expected: 50 },
  { limit: Number.NaN, expected: 15 },
  { limit: Number.POSITIVE_INFINITY, expected: 15 },
])("bounds page size $limit to $expected", async ({ limit, expected }) => {
  const candidates = Array.from({ length: 60 }, (_, createdAt) =>
    run({ _id: id<"runs">(`run-${createdAt}`), createdAt })
  )
  const page = await pageRunMatches(ctx, search(candidates), { limit })
  expect(page.runs).toHaveLength(expected)
  expect(page.cursor).toEqual(expect.any(String))
})

function search(candidates: Doc<"runs">[], args: Partial<SearchRunsArgs> = {}) {
  return { current: run({}), candidates, mode: "search" as const, ...args }
}

function requiredCursor(page: { cursor: string | null }) {
  expect(page.cursor).toEqual(expect.any(String))
  if (page.cursor === null) {
    throw new Error("Expected another page")
  }
  return page.cursor
}

function run(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    principal: { kind: "organization" },
    audience: "organization",
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status: "running",
    organizationId: "organization",
    ...overrides,
  }
}
