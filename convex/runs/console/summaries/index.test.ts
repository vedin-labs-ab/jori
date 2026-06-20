import { expect, test } from "vitest"
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
    reason: { type: "event", eventId: "event" },
    title: "Deep analysis",
    task: "Perform the deep analysis.",
    display: eventAutomationDisplay({
      surface: { type: "slack", label: "Slack" },
      event: { type: "message.created", label: "New channel message" },
      metadata: [{ type: "channel", label: "C123" }],
    }),
  })
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.title).toBe("Deep analysis")
  expect(summary.task).toBe("Perform the deep analysis.")
  expect(summary.searchableText).toContain("perform the deep analysis")
  expect("promptUrl" in summary).toBe(false)
  expect(summary.source).toEqual({
    type: "automation",
    surface: { type: "slack", label: "Slack" },
    event: { type: "message.created", label: "New channel message" },
    metadata: [{ type: "channel", label: "C123" }],
  })
})

test("uses stored message snapshots when the message document is unavailable", async () => {
  const run = testRun({
    reason: {
      type: "message",
      messageId: "missing-message",
      kind: "mention",
    },
    title: "Please summarize this thread.",
    task: "Please summarize this thread.\n\nKeep it concise.",
    display: messageDisplay({
      kind: "mention",
      metadata: [{ type: "channel", label: "C123" }],
    }),
  })
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.source).toEqual({
    type: "message",
    kind: { type: "mention", label: "mention" },
    surface: { type: "slack", label: "Slack" },
    metadata: [{ type: "channel", label: "C123" }],
  })
})

test("uses stored message snapshots instead of message text", async () => {
  const run = testRun({
    reason: { type: "message", messageId: "message", kind: "reply" },
    title: "Please summarize this thread.",
    task: "Stored task.",
    display: messageDisplay({
      kind: "reply",
      metadata: [{ type: "channel", label: "C123" }],
    }),
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
        text: "Please summarize this thread.\n\nKeep it concise.",
        metadata: [{ type: "channel", label: "C123" }],
        createdAt: 0,
      },
      run,
    }),
    run
  )

  expect(summary.title).toBe("Please summarize this thread.")
  expect(summary.task).toBe("Stored task.")
  expect(summary.source).toEqual({
    type: "message",
    kind: { type: "reply", label: "reply" },
    surface: { type: "slack", label: "Slack" },
    metadata: [{ type: "channel", label: "C123" }],
  })
  expect(summary.searchableText).not.toContain("keep it concise")
})

test("summarizes mention runs with source task links", async () => {
  const run = testRun({
    reason: { type: "message", messageId: "message", kind: "mention" },
    title: "Please summarize this thread.",
    task: "Please summarize this thread.",
    display: messageDisplay({
      kind: "mention",
      metadata: [{ type: "channel", label: "#product" }],
      details: [
        {
          type: "channel",
          label: "#product",
          url: "https://slack.com/app_redirect?channel=C123&team=slack-team",
        },
      ],
      taskSource: {
        label: "Source",
        url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=slack-team",
      },
    }),
  })
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.source).toEqual({
    type: "message",
    kind: { type: "mention", label: "mention" },
    surface: { type: "slack", label: "Slack" },
    metadata: [{ type: "channel", label: "#product" }],
  })
  expect(summary.taskSource).toEqual({
    label: "Source",
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
    reason: { type: "time", scheduledAt: 0 },
    title: "Original automation name",
    task: "Original automation instructions.",
    display: automationDisplay(),
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
        createdBy: "user",
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
    metadata: [],
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
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  }
}

function testRun(overrides: Record<string, unknown>) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    promptId: "prompt",
    status: "completed",
    createdAt: 0,
    finishedAt: 1000,
    ...overrides,
  } as Parameters<typeof summarizeRun>[1]
}

function fakeQueryCtx(docs: Record<string, unknown>) {
  return {
    db: {
      get: async (id: string) => docs[id] ?? null,
      query: () => ({
        withIndex: () => ({
          first: async () => null,
          order: () => ({
            first: async () => null,
          }),
        }),
      }),
    },
  } as unknown as QueryCtx
}
