import { expect, test } from "vitest"
import {
  fakeQueryCtx,
  jobDisplay,
  testRun,
} from "../../../../test/convex/console"
import { summarizeRun } from "../summaries"

test("includes stopped details for stopped runs", async () => {
  const run = testRun(manualRun("Manual run", "Stop this run."), {
    status: "stopped",
    endedAt: 2000,
    stoppedBy: { kind: "person", email: "albin@example.com" },
  })
  const summary = await summarizeRun(
    fakeQueryCtx({
      run,
    }),
    run
  )

  expect(summary.details).toContainEqual({
    type: "stopped",
    label: "albin@example.com",
    timestamp: 2000,
  })
})

test("includes approved decision actor details", async () => {
  const run = testRun(manualRun("Approval run", "Ask for approval."))
  const summary = await summarizeRun(
    fakeQueryCtx({
      run,
    }),
    run,
    undefined,
    {
      _id: "approval",
      _creationTime: 0,
      organizationId: "organization",
      runId: "run",
      surface: "slack",
      tool: "chat_postMessage",
      args: {},
      summary: "Send a message.",
      code: "code",
      requestedBy: { kind: "person", email: "requester@example.com" },
      decidedBy: { kind: "person", email: "approver@example.com" },
      status: "approved",
      createdAt: 0,
      expiresAt: 1000,
      decidedAt: 500,
    } as Parameters<typeof summarizeRun>[3]
  )

  expect(summary.details).toContainEqual({
    type: "decision",
    label: "approver@example.com",
    timestamp: 500,
  })
})

function manualRun(title: string, task: string) {
  return {
    _id: "run",
    _creationTime: 0,
    organizationId: "organization",
    cause: { type: "manual" },
    instructions: task,
    snapshot: {
      title,
      ...jobDisplay({
        source: { type: "manual" },
      }),
    },
    createdAt: 0,
  }
}
