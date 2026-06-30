import { expect, test } from "vitest"
import { type Id } from "../../../_generated/dataModel"
import { type QueryCtx } from "../../../_generated/server"
import {
  automationDisplay,
  eventAutomationDisplay,
  messageDisplay,
} from "../display"
import { summarizeRun } from "../summaries"

test("uses stored automation snapshots when the automation document is unavailable", async () => {
  const run = testRun({
    automationId: "missing-automation",
    cause: { type: "event", eventId: "event" },
    title: "Deep analysis",
    instructions: "Perform the deep analysis.",
    snapshot: {
      title: "Deep analysis",
      ...eventAutomationDisplay({
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
    type: "automation",
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
      ...eventAutomationDisplay({
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
        tenantId: "tenant",
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
    type: "automation",
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
        tenantId: "tenant",
        integrationId: "integration",
        integration: "slack",
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

test("keeps stored automation snapshots when the automation changes", async () => {
  const run = testRun({
    automationId: "automation",
    cause: { type: "time", scheduledAt: 0 },
    instructions: "Original automation instructions.",
    snapshot: {
      title: "Original automation name",
      ...automationDisplay(),
    },
  })
  const summary = await summarizeRun(
    fakeQueryCtx({
      automation: {
        _id: "automation",
        _creationTime: 0,
        tenantId: "tenant",
        name: "Updated automation name",
        instructions: "Updated automation instructions.",
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

  expect(summary.title).toBe("Original automation name")
  expect(summary.task).toBe("Original automation instructions.")
  expect(summary.source).toEqual({
    type: "automation",
  })
})

function slackIntegration() {
  return {
    _id: "integration",
    _creationTime: 0,
    tenantId: "tenant",
    integration: "slack",
    scope: "tenant",
    externalId: "slack-team",
    credentials: {},
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  }
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
    tenantId: "tenant",
    status: "completed",
    createdAt: 0,
    endedAt: 1000,
    ...overrides,
  } as Parameters<typeof summarizeRun>[1]
}

function fakeQueryCtx(docs: Record<string, unknown>) {
  return {
    db: {
      get: async (id: string) => docs[id] ?? null,
      query: () => ({
        withIndex: () => emptyQueryResult(),
      }),
    },
  } as unknown as QueryCtx
}

function emptyQueryResult() {
  return {
    async *[Symbol.asyncIterator]() {},
    first: async () => null,
    order: () => emptyQueryResult(),
  }
}
