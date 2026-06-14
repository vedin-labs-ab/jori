import { expect, test } from "vitest"
import { type QueryCtx } from "../../_generated/server"
import { summarizeExecution } from "./summaries"

test("includes one-shot scheduled automation details", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 21, 34)
  const summary = await summarizeExecution(
    fakeQueryCtx({
      automation: oneShotAutomation(scheduledAt),
      integration: slackIntegration(),
      run: oneShotRun(scheduledAt),
    }),
    execution({ createdAt: scheduledAt + 1000, finishedAt: scheduledAt + 2000 })
  )

  expect(summary.source).toEqual({
    type: "automation",
    provider: { type: "milo", label: "Milo" },
    kind: { type: "one-shot", label: "one-shot" },
    metadata: [],
  })
  expect(summary.details).toEqual([
    { type: "scheduled", label: "Scheduled", at: scheduledAt },
    {
      type: "tools",
      label: "Slack: Send message, Read channel history",
      groups: [
        {
          type: "slack",
          label: "Slack",
          values: ["Send message", "Read channel history"],
        },
      ],
    },
    { type: "web_search", label: "Yes" },
  ])
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
    createdAt: scheduledAt + 1000,
  }
}

function oneShotAutomation(scheduledAt: number) {
  return {
    _id: "automation",
    _creationTime: 0,
    tenantId: "tenant",
    name: "Daily image",
    instructions: "Generate a team image.",
    trigger: { type: "once", at: scheduledAt },
    access: {
      integrations: [
        {
          integrationId: "integration",
          tools: ["conversations_add_message", "conversations_history"],
        },
      ],
      web: true,
    },
    status: "completed",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
    lastRunAt: scheduledAt,
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
