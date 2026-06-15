import { expect, test } from "vitest"
import { type QueryCtx } from "../../_generated/server"
import { summarizeExecution } from "./summaries"

test("includes recurring automation details", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 9)
  const nextAt = Date.UTC(2026, 5, 15, 9)
  const summary = await summarizeExecution(
    fakeQueryCtx({
      automation: recurringAutomation({ nextAt }),
      integration: slackIntegration(),
      run: recurringRun(scheduledAt),
    }),
    execution({
      createdAt: scheduledAt + 1000,
      finishedAt: scheduledAt + 2000,
      toolSnapshot: slackToolSnapshot(),
    })
  )

  expect(summary.source).toEqual({
    type: "automation",
    provider: { type: "milo", label: "Milo" },
    kind: { type: "recurring", label: "recurring" },
    metadata: [{ type: "schedule", label: "Daily at 09:00 UTC" }],
  })
  expect(summary.details).toEqual([
    { type: "next", label: "Next", at: nextAt },
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

test("includes paused recurring automation status without next run details", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 9)
  const nextAt = Date.UTC(2026, 5, 15, 9)
  const summary = await summarizeExecution(
    fakeQueryCtx({
      automation: recurringAutomation({ nextAt, status: "paused" }),
      integration: slackIntegration(),
      run: recurringRun(scheduledAt),
    }),
    execution({ createdAt: scheduledAt + 1000, finishedAt: scheduledAt + 2000 })
  )

  expect(summary.details).toContainEqual({
    type: "status",
    label: "Paused",
  })
  expect(summary.details.some((detail) => detail.type === "next")).toBe(false)
})

function recurringRun(scheduledAt: number) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    automationId: "automation",
    reason: { type: "time", scheduledAt },
    title: "Daily image",
    task: "Generate a team image.",
    createdAt: scheduledAt + 1000,
  }
}

function recurringAutomation({
  nextAt,
  status = "active",
}: {
  nextAt: number
  status?: "active" | "paused"
}) {
  return {
    _id: "automation",
    _creationTime: 0,
    tenantId: "tenant",
    name: "Daily image",
    instructions: "Generate a team image.",
    trigger: {
      type: "cron",
      cron: "0 9 * * *",
      nextAt,
      functionId: "scheduled",
    },
    access: {
      integrations: [
        {
          integrationId: "integration",
          tools: ["conversations_add_message", "conversations_history"],
        },
      ],
      web: true,
    },
    status,
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
    lastRunAt: nextAt,
  }
}

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

function execution(overrides: Record<string, unknown> = {}) {
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

function slackToolSnapshot() {
  return {
    groups: [
      {
        provider: "slack",
        label: "Slack",
        tools: slackTools(),
      },
    ],
    webSearch: true,
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
