import { expect, test } from "vitest"
import { type QueryCtx } from "../../../_generated/server"
import { automationDisplay, eventAutomationDisplay } from "../display"
import { summarizeExecution } from "../summaries"

test("includes stopped details for stopped executions", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      run: manualRun("Manual run", "Stop this run."),
    }),
    execution({
      status: "stopped",
      stoppedAt: 2000,
      stoppedBy: "albin@example.com",
    })
  )

  expect(summary.details).toContainEqual({
    type: "stopped",
    label: "albin@example.com",
    at: 2000,
  })
})

test("includes approved decision actor details", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      run: manualRun("Approval run", "Ask for approval."),
    }),
    execution(),
    {
      _id: "approval",
      _creationTime: 0,
      tenantId: "tenant",
      executionId: "execution",
      surface: "slack",
      tool: "chat_postMessage",
      args: {},
      summary: "Send a message.",
      handoff: {
        objective: "Send a message",
        progress: "Ready",
        next: "Send",
      },
      code: "code",
      requestedBy: { email: "requester@example.com" },
      decidedBy: { email: "approver@example.com" },
      decision: "approved",
      createdAt: 0,
      expiresAt: 1000,
      decidedAt: 500,
    } as Parameters<typeof summarizeExecution>[2]
  )

  expect(summary.details).toContainEqual({
    type: "decision",
    label: "approver@example.com",
    at: 500,
  })
})

test("includes linked provider source details", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      event: githubIssueCommentEvent(),
      integration: githubIntegration(),
      run: eventRun("GitHub event", "Handle the issue comment."),
    }),
    execution()
  )

  expect(summary.details).toEqual([
    {
      type: "repository",
      label: "vedin-labs/frontier",
      url: "https://github.com/vedin-labs/frontier",
    },
    {
      type: "issue",
      label: "#42: Callback fails",
      url: "https://github.com/vedin-labs/frontier/issues/42",
    },
    {
      type: "comment",
      label: "Can you investigate this failing callback?",
      url: "https://github.com/vedin-labs/frontier/issues/42#comment-123",
    },
  ])
})

function manualRun(title: string, task: string) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    reason: { type: "manual" },
    title,
    task,
    display: automationDisplay({
      source: { type: "manual", metadata: [] },
      trigger: "Manual run",
    }),
    createdAt: 0,
  }
}

function eventRun(title: string, task: string) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    reason: { type: "event", eventId: "event" },
    title,
    task,
    display: eventAutomationDisplay({
      surface: { type: "github", label: "GitHub" },
      event: { type: "issue.comment.created", label: "New issue comment" },
      details: [
        {
          type: "repository",
          label: "vedin-labs/frontier",
          url: "https://github.com/vedin-labs/frontier",
        },
        {
          type: "issue",
          label: "#42: Callback fails",
          url: "https://github.com/vedin-labs/frontier/issues/42",
        },
        {
          type: "comment",
          label: "Can you investigate this failing callback?",
          url: "https://github.com/vedin-labs/frontier/issues/42#comment-123",
        },
      ],
    }),
    createdAt: 0,
  }
}

function githubIssueCommentEvent() {
  return {
    _id: "event",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
    integration: "github",
    key: "github:event",
    type: "issue.comment.created",
    text: "Can you investigate this failing callback?",
    data: {
      repository: {
        fullName: "vedin-labs/frontier",
        url: "https://github.com/vedin-labs/frontier",
      },
      issueNumber: 42,
      issue: {
        number: 42,
        title: "Callback fails",
        url: "https://github.com/vedin-labs/frontier/issues/42",
      },
      comment: {
        id: "123",
        url: "https://github.com/vedin-labs/frontier/issues/42#comment-123",
      },
    },
    metadata: [],
    createdAt: 0,
  }
}

function githubIntegration() {
  return {
    _id: "integration",
    _creationTime: 0,
    tenantId: "tenant",
    integration: "github",
    scope: "tenant",
    externalId: "github-installation",
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
