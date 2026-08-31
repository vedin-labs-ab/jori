import { expect, test } from "vitest"
import { getToolPermission } from "../../../../contracts/permissions"
import {
  eventAutomationDisplay,
  fakeQueryCtx,
  messageDisplay,
  preparedTraceRows,
} from "../../../../test/convex/console"
import { id } from "../../../../test/convex/database"
import { integrationDoc } from "../../../../test/convex/integrations"
import { summarizeRun } from "../summaries"

test("shows stored tools for event automation runs", async () => {
  const run = testRun(eventRun(), { preparedTools: slackToolSnapshot() })
  const summary = await summarizeRun(
    fakeQueryCtx(
      {
        event: event(),
        integration: slackIntegration(),
        run,
      },
      { traces: preparedTraceRows(run) }
    ),
    run
  )

  expect(summary.details).toContainEqual(slackToolsDetail())
  expect(summary.details).toContainEqual(webSearchDetail("Allowed"))
})

test("shows stored blocked web search for event automation runs", async () => {
  const run = testRun(eventRun(), { preparedTools: slackToolSnapshot(false) })
  const summary = await summarizeRun(
    fakeQueryCtx(
      {
        event: event(),
        integration: slackIntegration(),
        run,
      },
      { traces: preparedTraceRows(run) }
    ),
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
      fakeQueryCtx(
        {
          integration: slackIntegration(),
          message: message(kind),
          run,
        },
        { traces: preparedTraceRows(run) }
      ),
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
      fakeQueryCtx(
        {
          integration: slackIntegration(),
          message: message(kind),
          run,
        },
        { traces: preparedTraceRows(run) }
      ),
      run
    )

    expect(summary.details).toContainEqual(slackToolsDetail("read"))
  }
})

function slackIntegration() {
  return integrationDoc({
    _id: id<"integrations">("integration"),
    integration: "slack",
    externalId: "slack-team",
  })
}

function event() {
  return {
    _id: "event",
    _creationTime: 0,
    organizationId: "organization",
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
    organizationId: "organization",
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
    automation: { id: "missing-automation" },
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
    organizationId: "organization",
    status: "completed",
    createdAt: 0,
    endedAt: 1000,
    ...run,
    ...overrides,
  } as Parameters<typeof summarizeRun>[1] & { preparedTools?: unknown }
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
        tools: slackSnapshotTools(approvalAccess),
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
        tools: slackDisplayTools(approvalAccess),
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

function slackSnapshotTools(approvalAccess?: "read" | "write") {
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

function slackDisplayTools(approvalAccess?: "read" | "write") {
  return [
    catalogTool("conversations_add_message", "write", approvalAccess),
    catalogTool("conversations_history", "read", approvalAccess),
  ]
}

function catalogTool(
  tool: string,
  access: "read" | "write",
  approvalAccess?: "read" | "write"
) {
  const permission = getToolPermission(tool)

  if (permission === undefined) {
    throw new Error(`Missing permission: ${tool}`)
  }

  return {
    access,
    description: permission.description,
    label: permission.label,
    ...(approvalAccess === access ? { requiresApproval: true } : {}),
    tool,
  }
}
