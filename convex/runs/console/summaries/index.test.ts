import { expect, test } from "vitest"
import {
  eventJobDisplay,
  fakeQueryCtx,
  jobDisplay,
  messageDisplay,
} from "../../../../test/convex/console"
import { id } from "../../../../test/convex/database"
import { integrationDoc } from "../../../../test/convex/integrations"
import { type Id } from "../../../_generated/dataModel"
import { summarizeRun } from "../summaries"

test("uses stored job snapshots when the job document is unavailable", async () => {
  const run = testRun({
    job: { id: "missing-job" },
    cause: { type: "event", eventId: "event" },
    title: "Deep analysis",
    instructions: "Perform the deep analysis.",
    snapshot: {
      title: "Deep analysis",
      ...eventJobDisplay({
        context: [{ type: "channel", label: "C123" }],
        surface: "slack",
      }),
    },
  })
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.title).toBe("Deep analysis")
  expect(summary.task).toBe("Perform the deep analysis.")
  expect(summary.searchableText).toContain("perform the deep analysis")
  expect("promptUrl" in summary).toBe(false)
  expect(summary.source).toEqual({
    type: "job",
    surface: "slack",
  })
  expect(summary.details).toContainEqual({ type: "channel", label: "C123" })
})

test("uses stored message snapshots when the message document is unavailable", async () => {
  const run = testRun({
    cause: {
      type: "message",
      messageId: "missing-message",
      kind: "mention",
    },
    snapshot: {
      title: "Please summarize this thread.",
      ...messageDisplay({
        context: [{ type: "channel", label: "C123" }],
        kind: "mention",
      }),
    },
  })
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.source).toEqual({
    kind: { label: "mention", type: "mention" },
    type: "message",
    surface: "slack",
  })
})

test("summarizes event source labels from already-loaded event context", async () => {
  const run = testRun({
    cause: { type: "event", eventId: "event" },
    snapshot: {
      title: "Review the pull request comment.",
      ...eventJobDisplay({
        context: [{ type: "repository", label: "frontier" }],
        surface: "github",
      }),
    },
  })
  const summary = await summarizeRun(
    fakeQueryCtx({
      event: {
        _id: "event",
        _creationTime: 0,
        organizationId: "organization",
        integrationId: "integration",
        key: "github:event",
        type: "pull_request.review_comment.created",
      },
      integration: githubIntegration(),
      run,
    }),
    run
  )

  expect(summary.source).toEqual({
    event: {
      label: "Pull request review comment created",
      type: "pull_request.review_comment.created",
    },
    surface: "github",
    type: "job",
  })
})

test("uses source message text for message tasks", async () => {
  const run = testRun({
    cause: { type: "message", messageId: "message", kind: "reply" },
    snapshot: {
      title: "Please summarize this thread.",
      ...messageDisplay({
        context: [{ type: "channel", label: "C123" }],
        kind: "reply",
      }),
    },
  })
  const summary = await summarizeRun(
    fakeQueryCtx({
      integration: slackIntegration(),
      message: {
        _id: "message",
        _creationTime: 0,
        organizationId: "organization",
        integrationId: "integration",
        surface: "slack",
        type: "message.channels",
        externalId: "slack:message",
        mentioned: false,
        text: "Please summarize this thread.\n\nKeep it concise.",
        data: {
          channel: { id: "C123", name: "product" },
          ts: "1700000000.000000",
        },
        createdAt: 0,
      },
      run,
    }),
    run
  )

  expect(summary.title).toBe("Please summarize this thread.")
  expect(summary.task).toBe("Please summarize this thread.\n\nKeep it concise.")
  expect(summary.source).toEqual({
    kind: { label: "reply", type: "reply" },
    type: "message",
    surface: "slack",
  })
  expect(summary.searchableText).toContain("keep it concise")
})

test("summarizes mention runs with source task links", async () => {
  const run = testRun({
    cause: { type: "message", messageId: "message", kind: "mention" },
    snapshot: {
      title: "Please summarize this thread.",
      ...messageDisplay({
        context: [
          {
            type: "channel",
            label: "#product",
            url: "https://slack.com/app_redirect?channel=C123&team=slack-team",
          },
        ],
        kind: "mention",
        url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=slack-team",
      }),
    },
  })
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.source).toEqual({
    kind: { label: "mention", type: "mention" },
    type: "message",
    surface: "slack",
    url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=slack-team",
  })
  expect(summary.details).toEqual([
    {
      type: "channel",
      label: "#product",
      url: "https://slack.com/app_redirect?channel=C123&team=slack-team",
    },
  ])
})

test("keeps stored job snapshots when the job changes", async () => {
  const run = testRun({
    job: { id: "job" },
    cause: { type: "time", scheduledAt: 0 },
    instructions: "Original job instructions.",
    snapshot: {
      title: "Original job name",
      ...jobDisplay(),
    },
  })
  const summary = await summarizeRun(
    fakeQueryCtx({
      job: {
        _id: "job",
        _creationTime: 0,
        organizationId: "organization",
        name: "Updated job name",
        instructions: "Updated job instructions.",
        trigger: { type: "time" },
        access: { integrations: [] },
        createdBy: "person" as Id<"persons">,
        createdAt: 0,
        updatedAt: 0,
      },
      run,
    }),
    run
  )

  expect(summary.title).toBe("Original job name")
  expect(summary.task).toBe("Original job instructions.")
  expect(summary.source).toEqual({
    type: "job",
  })
})

function slackIntegration() {
  return integrationDoc({
    _id: id<"integrations">("integration"),
    integration: "slack",
    externalId: "slack-team",
  })
}

function githubIntegration() {
  return {
    ...slackIntegration(),
    integration: "github",
  }
}

function testRun(overrides: Record<string, unknown>) {
  return {
    _id: "run",
    _creationTime: 0,
    organizationId: "organization",
    status: "completed",
    createdAt: 0,
    endedAt: 1000,
    ...overrides,
  } as Parameters<typeof summarizeRun>[1]
}
