import { expect, test } from "vitest"
import {
  fakeQueryCtx,
  oneShotDisplay,
  preparedTraceRows,
  testRun,
} from "../../../../test/convex/console"
import { slackIntegration } from "../../../../test/convex/integrations"
import {
  slackDisplayTools,
  slackToolSnapshot,
} from "../../../../test/convex/tools"
import { type Id } from "../../../_generated/dataModel"
import { summarizeRun } from "../summaries"

test("includes one-shot job access details", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 21, 34)
  const run = testRun(oneShotRun(scheduledAt), {
    createdAt: scheduledAt + 1000,
    endedAt: scheduledAt + 2000,
    preparedTools: slackToolSnapshot(),
  })
  const summary = await summarizeRun(
    fakeQueryCtx(
      {
        job: oneShotJob(scheduledAt),
        integration: slackIntegration(),
        run,
      },
      { traces: preparedTraceRows(run) }
    ),
    run
  )

  expect(summary.source).toEqual({
    kind: { label: "one-shot", type: "one-shot" },
    type: "job",
    surface: "jori",
  })
  expect(summary.details).toEqual([
    {
      type: "tools",
      label: "Slack · Read 1 · Write 1",
      groups: [
        {
          type: "slack",
          label: "Slack",
          tools: slackDisplayTools(),
        },
      ],
    },
  ])
})

test("keeps the one-shot label after an owned job is cleaned up", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 21, 34)
  const run = testRun(
    {
      ...oneShotRun(scheduledAt),
      job: { id: "job", parentId: "parent" },
    },
    { createdAt: scheduledAt + 1000, endedAt: scheduledAt + 2000 }
  )
  const summary = await summarizeRun(
    fakeQueryCtx({ job: null, run }, { traces: preparedTraceRows(run) }),
    run
  )

  expect(summary.source).toEqual({
    kind: { label: "one-shot", type: "one-shot" },
    type: "job",
    surface: "jori",
  })
})

function oneShotRun(scheduledAt: number) {
  return {
    _id: "run",
    _creationTime: 0,
    organizationId: "organization",
    job: { id: "job" },
    cause: { type: "time", scheduledAt },
    instructions: "Generate a team image.",
    snapshot: {
      title: "Daily image",
      ...oneShotDisplay(),
    },
    createdAt: scheduledAt + 1000,
  }
}

function oneShotJob(scheduledAt: number) {
  return {
    _id: "job",
    _creationTime: 0,
    organizationId: "organization",
    name: "Daily image",
    instructions: "Generate a team image.",
    type: "once",
    trigger: { timestamp: scheduledAt },
    access: {
      integrations: [
        {
          id: "integration",
          tools: ["conversations_add_message", "conversations_history"],
        },
      ],
      jori: [],
    },
    status: "completed",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
    firedAt: scheduledAt,
  }
}
