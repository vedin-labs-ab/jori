import { expect, test } from "vitest"
import {
  automationDisplay,
  eventAutomationDisplay,
  fakeQueryCtx,
} from "../../../../test/convex/console"
import { id } from "../../../../test/convex/database"
import { integrationDoc } from "../../../../test/convex/integrations"
import { summarizeRun } from "../summaries"

test("includes stopped details for stopped runs", async () => {
  const run = testRun(manualRun("Manual run", "Stop this run."), {
    status: "stopped",
    endedAt: 2000,
    stoppedBy: { kind: "person", email: "albin@example.com" },
  })
  const summary = await summarizeRun(
    fakeQueryCtx({
      run,
    }),
    run
  )

  expect(summary.details).toContainEqual({
    type: "stopped",
    label: "albin@example.com",
    timestamp: 2000,
  })
})

test("includes approved decision actor details", async () => {
  const run = testRun(manualRun("Approval run", "Ask for approval."))
  const summary = await summarizeRun(
    fakeQueryCtx({
      run,
    }),
    run,
    undefined,
    {
      _id: "approval",
      _creationTime: 0,
      organizationId: "organization",
      runId: "run",
      surface: "slack",
      tool: "chat_postMessage",
      args: {},
      summary: "Send a message.",
      code: "code",
      requestedBy: { kind: "person", email: "requester@example.com" },
      decidedBy: { kind: "person", email: "approver@example.com" },
      status: "approved",
      createdAt: 0,
      expiresAt: 1000,
      decidedAt: 500,
    } as Parameters<typeof summarizeRun>[3]
  )

  expect(summary.details).toContainEqual({
    type: "decision",
    label: "approver@example.com",
    timestamp: 500,
  })
})

test("includes linked provider source details", async () => {
  const run = testRun(eventRun("GitHub event", "Handle the issue comment."))
  const summary = await summarizeRun(
    fakeQueryCtx({
      event: githubIssueCommentEvent(),
      integration: githubIntegration(),
      run,
    }),
    run
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
    organizationId: "organization",
    cause: { type: "manual" },
    instructions: task,
    snapshot: {
      title,
      ...automationDisplay({
        source: { type: "manual" },
      }),
    },
    createdAt: 0,
  }
}

function eventRun(title: string, task: string) {
  return {
    _id: "run",
    _creationTime: 0,
    organizationId: "organization",
    cause: { type: "event", eventId: "event" },
    instructions: task,
    snapshot: {
      title,
      ...eventAutomationDisplay({
        surface: "github",
        context: [
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
    },
    createdAt: 0,
  }
}

function githubIssueCommentEvent() {
  return {
    _id: "event",
    _creationTime: 0,
    organizationId: "organization",
    integrationId: "integration",
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
  }
}

function githubIntegration() {
  return integrationDoc({
    _id: id<"integrations">("integration"),
    integration: "github",
    externalId: "github-installation",
  })
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
