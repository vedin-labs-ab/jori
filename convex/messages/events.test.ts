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
          data: { channelId: "C123" },
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

  test("projects GitHub issue comments to issue criteria", () => {
    expect(
      readAutomationEventsForMessage({
        integration: integration("github"),
        message: {
          externalId: "github:1:delivery",
          data: {
            eventType: "issue_comment",
            repository: { fullName: "milo/app" },
            issueNumber: 42,
            isPullRequest: false,
          },
        },
      })
    ).toMatchObject([
      {
        type: "issue.comment.changed",
        criteria: { repo: "milo/app", issue: "42" },
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
            eventType: "pull_request_review_comment",
            repository: { fullName: "milo/app" },
            pullNumber: 12,
            comment: { path: "src/app.ts" },
          },
        },
      })
    ).toMatchObject([
      {
        type: "pull_request.review_comment.changed",
        criteria: { repo: "milo/app", pr: "12", path: "src/app.ts" },
      },
    ])
  })

  test("projects Linear comments with team and project criteria", () => {
    expect(
      readAutomationEventsForMessage({
        integration: integration("linear"),
        message: {
          externalId: "linear:org:comment",
          data: {
            issueId: "issue-id",
            teamId: "team-id",
            projectId: "project-id",
          },
        },
      })
    ).toMatchObject([
      {
        type: "issue.comment.changed",
        criteria: {
          issue: "issue-id",
          team: "team-id",
          project: "project-id",
        },
      },
    ])
  })
})

function integration(provider: Doc<"integrations">["provider"]) {
  return { provider } as Pick<Doc<"integrations">, "provider">
}
