import { expect, test } from "vitest"
import { type Id } from "../../../_generated/dataModel"
import { type QueryCtx } from "../../../_generated/server"
import { oneShotDisplay } from "../display"
import { summarizeRun } from "../summaries"

test("includes one-shot automation access details", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 21, 34)
  const run = testRun(oneShotRun(scheduledAt), {
    createdAt: scheduledAt + 1000,
    endedAt: scheduledAt + 2000,
    preparedTools: slackToolSnapshot(true),
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
    kind: { label: "one-shot", type: "one-shot" },
    type: "automation",
    surface: "milo",
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
    endedAt: scheduledAt + 2000,
    preparedTools: slackToolSnapshot(false),
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
    cause: { type: "time", scheduledAt },
    instructions: "Generate a team image.",
    snapshot: {
      title: "Daily image",
      ...oneShotDisplay(),
    },
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
    trigger: { timestamp: scheduledAt },
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
    createdBy: "person" as Id<"persons">,
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
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  }
}

function testRun(
  run: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) {
  return {
    status: "completed",
    endedAt: 1000,
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
        : emptyQueryResult(),
  }
}

function emptyQueryResult() {
  return {
    async *[Symbol.asyncIterator]() {},
    first: async () => null,
    order: () => emptyQueryResult(),
    take: async () => [],
  }
}
