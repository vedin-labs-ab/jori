import { expect, test } from "vitest"
import { type QueryCtx } from "../../../_generated/server"
import { oneShotDisplay } from "../display"
import { summarizeRun } from "../summaries"

test("includes one-shot automation access details", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 21, 34)
  const run = testRun(oneShotRun(scheduledAt), {
    createdAt: scheduledAt + 1000,
    finishedAt: scheduledAt + 2000,
    toolSnapshot: slackToolSnapshot(true),
  })
  const summary = await summarizeRun(
    fakeQueryCtx({
      automation: oneShotAutomation(scheduledAt),
      integration: slackIntegration(),
      run,
    }),
    run
  )

  expect(summary.source).toEqual({
    type: "automation",
    surface: { type: "milo", label: "Milo" },
    kind: { type: "one-shot", label: "one-shot" },
    metadata: [],
  })
  expect(summary.details).toEqual([
    {
      type: "tools",
      label: "Slack · Read 1 · Write 1",
      groups: [
        {
          type: "slack",
          label: "Slack",
          tools: slackTools(),
        },
      ],
    },
    { type: "web_search", label: "Allowed" },
  ])
})

test("marks one-shot automation web search as blocked when disabled", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 21, 34)
  const run = testRun(oneShotRun(scheduledAt), {
    createdAt: scheduledAt + 1000,
    finishedAt: scheduledAt + 2000,
    toolSnapshot: slackToolSnapshot(false),
  })
  const summary = await summarizeRun(
    fakeQueryCtx({
      automation: oneShotAutomation(scheduledAt, false),
      integration: slackIntegration(),
      run,
    }),
    run
  )

  expect(summary.details).toContainEqual({
    type: "web_search",
    label: "Blocked",
  })
})

function oneShotRun(scheduledAt: number) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    automationId: "automation",
    reason: { type: "time", scheduledAt },
    title: "Daily image",
    task: "Generate a team image.",
    display: oneShotDisplay(),
    createdAt: scheduledAt + 1000,
  }
}

function oneShotAutomation(scheduledAt: number, webSearch = true) {
  return {
    _id: "automation",
    _creationTime: 0,
    tenantId: "tenant",
    name: "Daily image",
    instructions: "Generate a team image.",
    type: "once",
    trigger: { at: scheduledAt },
    access: {
      integrations: [
        {
          id: "integration",
          tools: ["conversations_add_message", "conversations_history"],
        },
      ],
      web: webSearch,
    },
    status: "completed",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
    firedAt: scheduledAt,
  }
}

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

function testRun(
  run: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) {
  return {
    promptId: "prompt",
    status: "completed",
    finishedAt: 1000,
    ...run,
    ...overrides,
  } as Parameters<typeof summarizeRun>[1]
}

function slackToolSnapshot(webSearch: boolean) {
  return {
    groups: [
      {
        surface: "slack",
        label: "Slack",
        tools: slackTools(),
      },
    ],
    webSearch,
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
