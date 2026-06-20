import { expect, test } from "vitest"
import { type QueryCtx } from "../../../_generated/server"
import { eventAutomationDisplay, messageDisplay } from "../display"
import { summarizeRun } from "../summaries"

test("shows stored tools for event automation runs", async () => {
  const run = testRun(eventRun(), { preparedTools: slackToolSnapshot() })
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
  const run = testRun(eventRun(), { preparedTools: slackToolSnapshot(false) })
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
    const run = testRun(messageRun(kind), {
      preparedTools: slackToolSnapshot(),
    })
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
    const run = testRun(messageRun(kind), {
      preparedTools: slackToolSnapshot(true, "read"),
    })
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
    tenantId: "tenant",
    integration: "slack",
  }
}

function event() {
  return {
    _id: "event",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
    key: "slack:event",
    type: "message.created",
    data: { channel: { id: "C123", name: "social" } },
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
    mentioned: kind === "mention",
    text: "Please summarize this thread.",
    data: { channel: { id: "C123", name: "social" } },
    createdAt: 0,
  }
}

function eventRun() {
  return {
    automationId: "missing-automation",
    cause: { type: "event", eventId: "event" },
    instructions: "Perform the deep analysis.",
    snapshot: {
      title: "Deep analysis",
      ...eventAutomationDisplay({
        context: [{ type: "channel", label: "C123" }],
        surface: "slack",
      }),
    },
  }
}

function messageRun(kind: "mention" | "reply") {
  return {
    cause: { type: "message", messageId: "message", kind },
    snapshot: {
      title: "Please summarize this thread.",
      ...messageDisplay({
        context: [{ type: "channel", label: "C123" }],
        kind,
      }),
    },
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
    status: "completed",
    createdAt: 0,
    endedAt: 1000,
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
  const preparedTools = (docs.run as { preparedTools?: unknown }).preparedTools

  return {
    db: {
      get: async (id: string) => docs[id] ?? null,
      query: (table: string) => fakeQuery(table, preparedTools),
    },
  } as unknown as QueryCtx
}

function fakeQuery(table: string, preparedTools: unknown) {
  return {
    withIndex: () =>
      table === "traces"
        ? {
            first: async () =>
              preparedTools === undefined
                ? null
                : {
                    data: { tools: preparedTools },
                    type: "run.prepared",
                  },
          }
        : {
            order: () => ({
              first: async () => null,
            }),
          },
  }
}
