import { expect, test } from "vitest"
import { type QueryCtx } from "../../../_generated/server"
import { eventAutomationDisplay } from "../display"
import { summarizeRun } from "../summaries"

test("includes linked GitHub pull request details", async () => {
  const run = testRun(
    eventRun({
      title: "GitHub PR event",
      task: "Handle the pull request comment.",
      snapshot: githubDisplay(),
    })
  )
  const summary = await summarizeRun(
    fakeQueryCtx({
      event: githubPullRequestCommentEvent(),
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
      type: "pull_request",
      label: "#42: Add execution metadata",
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
  const run = testRun(
    eventRun({
      title: "Linear event",
      task: "Handle the Linear issue comment.",
      snapshot: linearDisplay(),
    })
  )
  const summary = await summarizeRun(
    fakeQueryCtx({
      event: linearIssueCommentEvent(),
      run,
    }),
    run
  )

  expect(summary.details).toContainEqual({
    type: "issue",
    label: "VED-5: Test issue",
    url: "https://linear.app/acme/issue/VED-5/test-issue",
  })
})

function eventRun(input: {
  snapshot: ReturnType<typeof eventAutomationDisplay>
  task: string
  title: string
}) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    cause: { type: "event", eventId: "event" },
    instructions: input.task,
    snapshot: {
      title: input.title,
      ...input.snapshot,
    },
    createdAt: 0,
  }
}

function githubDisplay() {
  return eventAutomationDisplay({
    surface: "github",
    context: [
      {
        type: "repository",
        label: "vedin-labs/frontier",
        url: "https://github.com/vedin-labs/frontier",
      },
      {
        type: "pull_request",
        label: "#42: Add execution metadata",
        url: "https://github.com/vedin-labs/frontier/pull/42",
      },
      {
        type: "comment",
        label: "Can you check this pull request?",
        url: "https://github.com/vedin-labs/frontier/pull/42#comment-123",
      },
    ],
  })
}

function linearDisplay() {
  return eventAutomationDisplay({
    surface: "linear",
    context: [
      {
        type: "issue",
        label: "VED-5: Test issue",
        url: "https://linear.app/acme/issue/VED-5/test-issue",
      },
      {
        type: "comment",
        label: "Please take a look.",
      },
    ],
  })
}

function githubPullRequestCommentEvent() {
  return {
    _id: "event",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
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
  }
}

function linearIssueCommentEvent() {
  return {
    _id: "event",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
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

function fakeQueryCtx(docs: Record<string, unknown>) {
  return {
    db: {
      get: async (id: string) => docs[id] ?? null,
      query: () => ({
        withIndex: () => ({
          first: async () => null,
          order: () => ({
            first: async () => null,
            take: async () => [],
          }),
        }),
      }),
    },
  } as unknown as QueryCtx
}
