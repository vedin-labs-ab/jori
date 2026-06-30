import { expect, test } from "vitest"
import { type Doc } from "../../../_generated/dataModel"
import { type QueryCtx } from "../../../_generated/server"
import { summarizeRun } from "../summaries"

test("summarizes active waiters for parked running runs", async () => {
  const run = testRun({
    status: "running",
    endedAt: undefined,
  })
  const summary = await summarizeRun(
    fakeQueryCtx({
      activeWaiter: {
        _id: "waiter",
        _creationTime: 1000,
        tenantId: "tenant",
        runId: "run",
        waitpointId: "waitpoint",
        status: "waiting",
        expiresAt: 2000,
        createdAt: 1000,
        updatedAt: 1000,
      } as Doc<"waiters">,
    }),
    run
  )

  expect(summary.waiter).toEqual({
    id: "waiter",
    expiresAt: 2000,
    state: "waiting",
  })
})

function testRun(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    status: "completed",
    cause: { type: "manual" },
    createdAt: 0,
    endedAt: 1000,
    snapshot: {
      context: [],
      source: { type: "manual" },
      title: "Connect GitHub",
    },
    ...overrides,
  } as Doc<"runs">
}

function fakeQueryCtx(docs: { activeWaiter?: Doc<"waiters"> }) {
  return {
    db: {
      get: async () => null,
      query: (table: string) => ({
        withIndex: () => ({
          first: async () =>
            table === "waiters" ? (docs.activeWaiter ?? null) : null,
          order: () => ({
            first: async () => null,
            take: async () => [],
          }),
        }),
      }),
    },
  } as unknown as QueryCtx
}
