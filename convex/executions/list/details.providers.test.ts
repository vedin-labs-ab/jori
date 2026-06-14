import { expect, test } from "vitest"
import { type QueryCtx } from "../../_generated/server"
import { summarizeExecution } from "./summaries"

test("includes linked GitHub pull request details", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      event: githubPullRequestCommentEvent(),
      integration: githubIntegration(),
      run: eventRun("GitHub PR event", "Handle the pull request comment."),
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
      type: "pull_request",
      label: "#42 Add execution metadata",
      url: "https://github.com/vedin-labs/frontier/pull/42",
    },
    {
      type: "comment",
      label: "Can you check this pull request?",
      url: "https://github.com/vedin-labs/frontier/pull/42#comment-123",
    },
  ])
})

test("formats Linear issue details with a colon", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      event: linearIssueCommentEvent(),
      run: eventRun("Linear event", "Handle the Linear issue comment."),
    }),
    execution()
  )

  expect(summary.details).toContainEqual({
    type: "issue",
    label: "VED-5: Test issue",
    url: "https://linear.app/acme/issue/VED-5/test-issue",
  })
})

function eventRun(title: string, task: string) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    reason: { type: "event", eventId: "event" },
    title,
    task,
    createdAt: 0,
  }
}

function githubPullRequestCommentEvent() {
  return {
    _id: "event",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
    provider: "github",
    key: "github:event",
    type: "pull_request.review_comment.created",
    text: "Can you check this pull request?",
    data: {
      repository: {
        fullName: "vedin-labs/frontier",
        url: "https://github.com/vedin-labs/frontier",
      },
      pullNumber: 42,
      isPullRequest: true,
      pullRequest: {
        number: 42,
        title: "Add execution metadata",
        url: "https://github.com/vedin-labs/frontier/pull/42",
      },
      comment: {
        id: "123",
        url: "https://github.com/vedin-labs/frontier/pull/42#comment-123",
      },
    },
    metadata: [],
    createdAt: 0,
  }
}

function linearIssueCommentEvent() {
  return {
    _id: "event",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
    provider: "linear",
    key: "linear:event",
    type: "issue.comment.created",
    text: "Please take a look.",
    data: {
      issueIdentifier: "VED-5",
      issue: {
        identifier: "VED-5",
        title: "Test issue",
        url: "https://linear.app/acme/issue/VED-5/test-issue",
      },
      commentId: "comment-123",
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
    provider: "github",
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
