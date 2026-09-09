import { expect, test } from "vitest"
import { fakeQueryCtx, runDoc } from "../../../../test/convex/console"
import { type Doc } from "../../../_generated/dataModel"
import { summarizeRun } from "../summaries"

test("summarizes active waiters for parked running runs", async () => {
  const run = runDoc({
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
            eventId: "event",
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
