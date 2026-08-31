import { expect, test } from "vitest"
import { fakeQueryCtx } from "../../../../test/convex/console"
import { type Doc } from "../../../_generated/dataModel"
import { summarizeRun } from "../summaries"

test("summarizes active waiters for parked running runs", async () => {
  const run = testRun({
    status: "running",
    endedAt: undefined,
  })
  const summary = await summarizeRun(
    fakeQueryCtx(
      {},
      {
        waiters: [
          {
            _id: "waiter",
            _creationTime: 1000,
            organizationId: "organization",
            runId: "run",
            waitpointId: "waitpoint",
            status: "waiting",
            expiresAt: 2000,
            createdAt: 1000,
            updatedAt: 1000,
          } as Doc<"waiters">,
        ],
      }
    ),
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
    organizationId: "organization",
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
