import { expect, test } from "vitest"
import { type QueryCtx } from "../../_generated/server"
import { eventAutomationDisplay, messageDisplay } from "./display.test.helpers"
import { summarizeExecution } from "./summaries"

test("shows stored tools for event automation runs", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      event: event(),
      integration: slackIntegration(),
      run: {
        _id: "run",
        _creationTime: 0,
        tenantId: "tenant",
        automationId: "missing-automation",
        reason: { type: "event", eventId: "event" },
        title: "Deep analysis",
        task: "Perform the deep analysis.",
        display: eventAutomationDisplay({
          provider: { type: "slack", label: "Slack" },
          event: { type: "message.created", label: "New channel message" },
          metadata: [{ type: "channel", label: "C123" }],
        }),
        createdAt: 0,
      },
    }),
    execution({ toolSnapshot: slackToolSnapshot() })
  )

  expect(summary.details).toContainEqual(slackToolsDetail())
  expect(summary.details).toContainEqual(webSearchDetail("Allowed"))
})

test("shows stored blocked web search for event automation runs", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      event: event(),
      integration: slackIntegration(),
      run: {
        _id: "run",
        _creationTime: 0,
        tenantId: "tenant",
        automationId: "missing-automation",
        reason: { type: "event", eventId: "event" },
        title: "Deep analysis",
        task: "Perform the deep analysis.",
        display: eventAutomationDisplay({
          provider: { type: "slack", label: "Slack" },
          event: { type: "message.created", label: "New channel message" },
          metadata: [{ type: "channel", label: "C123" }],
        }),
        createdAt: 0,
      },
    }),
    execution({ toolSnapshot: slackToolSnapshot(false) })
  )

  expect(summary.details).toContainEqual(webSearchDetail("Blocked"))
})

test("shows stored tools for mention and reply runs", async () => {
  for (const kind of ["mention", "reply"] as const) {
    const summary = await summarizeExecution(
      fakeQueryCtx({
        integration: slackIntegration(),
        message: message(kind),
        run: {
          _id: "run",
          _creationTime: 0,
          tenantId: "tenant",
          reason: { type: "message", messageId: "message", kind },
          title: "Please summarize this thread.",
          task: "Please summarize this thread.",
          display: messageDisplay({
            kind,
            metadata: [{ type: "channel", label: "C123" }],
          }),
          createdAt: 0,
        },
      }),
      execution({ toolSnapshot: slackToolSnapshot() })
    )

    expect(summary.details).toContainEqual(slackToolsDetail())
    expect(summary.details).toContainEqual(webSearchDetail("Allowed"))
  }
})

function slackIntegration() {
  return {
    _id: "integration",
    _creationTime: 0,
    tenantId: "tenant",
    provider: "slack",
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
    provider: "slack",
    key: "slack:event",
    type: "message.created",
    data: { channelId: "C123", ts: "1700000000.000000" },
    metadata: [{ type: "channel", label: "C123" }],
    createdAt: 0,
  }
}

function message(kind: "mention" | "reply") {
  return {
    _id: "message",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
    provider: "slack",
    type: "message.channels",
    externalId: `slack:${kind}`,
    text: "Please summarize this thread.",
    metadata: [{ type: "channel", label: "C123" }],
    createdAt: 0,
  }
}

function execution(overrides: Record<string, unknown>) {
  return {
    _id: "execution",
    _creationTime: 0,
    tenantId: "tenant",
    runId: "run",
    promptId: "prompt",
    status: "completed",
    createdAt: 0,
    finishedAt: 1000,
    ...overrides,
  } as Parameters<typeof summarizeExecution>[1]
}

function slackToolSnapshot(webSearch = true) {
  return {
    groups: [
      {
        provider: "slack",
        label: "Slack",
        tools: slackTools(),
      },
    ],
    webSearch,
  }
}

function slackToolsDetail() {
  return {
    type: "tools",
    label: "Slack · Read 1 · Write 1",
    groups: [
      {
        type: "slack",
        label: "Slack",
        tools: slackTools(),
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

function slackTools() {
  return [
    {
      access: "write" as const,
      description: "Post a Slack message.",
      label: "Send message",
      tool: "conversations_add_message",
    },
    {
      access: "read" as const,
      description: "Read Slack channel messages.",
      label: "Read channel history",
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
