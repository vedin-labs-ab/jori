import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { readAutomationEventsForMessage } from "./events"

describe("Slack and GitHub message automation event projection", () => {
  test("projects Slack messages to channel message events", () => {
    expect(
      readAutomationEventsForMessage({
        integration: integration("slack"),
        message: {
          externalId: "slack:T123:1",
          data: { channel: { id: "C123" } },
        },
      })
    ).toMatchObject([
      {
        type: "message.created",
        resource: "C123",
        criteria: { channel: "C123" },
      },
    ])
  })

  test("projects GitHub issue comments to created issue criteria", () => {
    expect(
      readAutomationEventsForMessage({
        integration: integration("github"),
        message: {
          externalId: "github:1:delivery",
          data: {
            action: "created",
            eventType: "issue_comment",
            repository: { fullName: "milo/app" },
            issueNumber: 42,
            isPullRequest: false,
          },
        },
      })
    ).toMatchObject([
      {
        type: "issue.comment.created",
        criteria: { repo: "milo/app", issue: "42" },
      },
    ])
  })

  test("projects GitHub pull request comments to edited pull request criteria", () => {
    expect(
      readAutomationEventsForMessage({
        integration: integration("github"),
        message: {
          externalId: "github:1:delivery",
          data: {
            action: "edited",
            eventType: "issue_comment",
            repository: { fullName: "milo/app" },
            issueNumber: 42,
            isPullRequest: true,
          },
        },
      })
    ).toMatchObject([
      {
        type: "pull_request.comment.edited",
        criteria: { repo: "milo/app", pr: "42" },
      },
    ])
  })
})

describe("review and Linear message automation event projection", () => {
  test("projects GitHub review comments to pull request path criteria", () => {
    expect(
      readAutomationEventsForMessage({
        integration: integration("github"),
        message: {
          externalId: "github:1:review",
          data: {
            action: "edited",
            eventType: "pull_request_review_comment",
            repository: { fullName: "milo/app" },
            pullNumber: 12,
            comment: { path: "src/app.ts" },
          },
        },
      })
    ).toMatchObject([
      {
        type: "pull_request.review_comment.edited",
        criteria: { repo: "milo/app", pr: "12", path: "src/app.ts" },
      },
    ])
  })

  test("projects Linear created comments with team and project criteria", () => {
    expect(
      readAutomationEventsForMessage({
        integration: integration("linear"),
        message: {
          externalId: "linear:org:comment",
          data: {
            action: "create",
            issueId: "issue-id",
            teamId: "team-id",
            projectId: "project-id",
          },
        },
      })
    ).toMatchObject([
      {
        type: "issue.comment.created",
        criteria: {
          issue: "issue-id",
          team: "team-id",
          project: "project-id",
        },
      },
    ])
  })

  test("projects Linear updated comments as edited events", () => {
    expect(
      readAutomationEventsForMessage({
        integration: integration("linear"),
        message: {
          externalId: "linear:org:comment",
          data: {
            action: "update",
            issueId: "issue-id",
          },
        },
      })
    ).toMatchObject([
      {
        type: "issue.comment.edited",
        criteria: {
          issue: "issue-id",
        },
      },
    ])
  })
})

function integration(integration: Doc<"integrations">["integration"]) {
  return { integration } as Pick<Doc<"integrations">, "integration">
}
