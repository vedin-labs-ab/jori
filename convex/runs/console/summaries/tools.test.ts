import { expect, test } from "vitest"
import { type QueryCtx } from "../../../_generated/server"
import { eventAutomationDisplay, messageDisplay } from "../display"
import { summarizeRun } from "../summaries"

test("shows stored tools for event automation runs", async () => {
  const run = testRun(
    {
      automationId: "missing-automation",
      reason: { type: "event", eventId: "event" },
      title: "Deep analysis",
      task: "Perform the deep analysis.",
      display: eventAutomationDisplay({
        surface: { type: "slack", label: "Slack" },
        event: { type: "message.created", label: "New channel message" },
        metadata: [{ type: "channel", label: "C123" }],
      }),
    },
    { toolSnapshot: slackToolSnapshot() }
  )
  const summary = await summarizeRun(
    fakeQueryCtx({
      event: event(),
      integration: slackIntegration(),
      run,
    }),
    run
  )

  expect(summary.details).toContainEqual(slackToolsDetail())
  expect(summary.details).toContainEqual(webSearchDetail("Allowed"))
})

test("shows stored blocked web search for event automation runs", async () => {
  const run = testRun(
    {
      automationId: "missing-automation",
      reason: { type: "event", eventId: "event" },
      title: "Deep analysis",
      task: "Perform the deep analysis.",
      display: eventAutomationDisplay({
        surface: { type: "slack", label: "Slack" },
        event: { type: "message.created", label: "New channel message" },
        metadata: [{ type: "channel", label: "C123" }],
      }),
    },
    { toolSnapshot: slackToolSnapshot(false) }
  )
  const summary = await summarizeRun(
    fakeQueryCtx({
      event: event(),
      integration: slackIntegration(),
      run,
    }),
    run
  )

  expect(summary.details).toContainEqual(webSearchDetail("Blocked"))
})

test("shows stored tools for mention and reply runs", async () => {
  for (const kind of ["mention", "reply"] as const) {
    const run = testRun(
      {
        reason: { type: "message", messageId: "message", kind },
        title: "Please summarize this thread.",
        task: "Please summarize this thread.",
        display: messageDisplay({
          kind,
          metadata: [{ type: "channel", label: "C123" }],
        }),
      },
      { toolSnapshot: slackToolSnapshot() }
    )
    const summary = await summarizeRun(
      fakeQueryCtx({
        integration: slackIntegration(),
        message: message(kind),
        run,
      }),
      run
    )

    expect(summary.details).toContainEqual(slackToolsDetail())
    expect(summary.details).toContainEqual(webSearchDetail("Allowed"))
  }
})

test("marks approval-required access counts in mention and reply runs", async () => {
  for (const kind of ["mention", "reply"] as const) {
    const run = testRun(
      {
        reason: { type: "message", messageId: "message", kind },
        title: "Please summarize this thread.",
        task: "Please summarize this thread.",
        display: messageDisplay({
          kind,
          metadata: [{ type: "channel", label: "C123" }],
        }),
      },
      { toolSnapshot: slackToolSnapshot(true, "read") }
    )
    const summary = await summarizeRun(
      fakeQueryCtx({
        integration: slackIntegration(),
        message: message(kind),
        run,
      }),
      run
    )

    expect(summary.details).toContainEqual(slackToolsDetail("read"))
  }
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

function event() {
  return {
    _id: "event",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
    integration: "slack",
    key: "slack:event",
    type: "message.created",
    data: {
      channel: { id: "C123", name: "social" },
      ts: "1700000000.000000",
    },
    metadata: [{ type: "channel", label: "#social" }],
    createdAt: 0,
  }
}

function message(kind: "mention" | "reply") {
  return {
    _id: "message",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
    integration: "slack",
    type: "message.channels",
    externalId: `slack:${kind}`,
    text: "Please summarize this thread.",
    data: {
      channel: { id: "C123", name: "social" },
      ts: "1700000000.000000",
    },
    createdAt: 0,
  }
}

function testRun(
  run: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    promptId: "prompt",
    status: "completed",
    createdAt: 0,
    finishedAt: 1000,
    ...run,
    ...overrides,
  } as Parameters<typeof summarizeRun>[1]
}

function slackToolSnapshot(
  webSearch = true,
  approvalAccess?: "read" | "write"
) {
  return {
    groups: [
      {
        surface: "slack",
        label: "Slack",
        tools: slackTools(approvalAccess),
      },
    ],
    webSearch,
  }
}

function slackToolsDetail(approvalAccess?: "read" | "write") {
  return {
    type: "tools",
    label: `Slack · Read 1${approvalAccess === "read" ? "*" : ""} · Write 1${approvalAccess === "write" ? "*" : ""}`,
    groups: [
      {
        type: "slack",
        label: "Slack",
        tools: slackTools(approvalAccess),
      },
    ],
  }
}

function webSearchDetail(label: "Allowed" | "Blocked") {
  return {
    type: "web_search",
    label,
  }
}

function slackTools(approvalAccess?: "read" | "write") {
  return [
    {
      access: "write" as const,
      description: "Post a Slack message.",
      label: "Send message",
      ...(approvalAccess === "write" ? { requiresApproval: true } : {}),
      tool: "conversations_add_message",
    },
    {
      access: "read" as const,
      description: "Read Slack channel messages.",
      label: "Read channel history",
      ...(approvalAccess === "read" ? { requiresApproval: true } : {}),
      tool: "conversations_history",
    },
  ]
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
