import { describe, expect, test } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { readJobEventsForMessage } from "./events"

describe("Slack and GitHub message job event projection", () => {
  test("projects Slack messages to channel message events", () => {
    expect(
      readJobEventsForMessage({
        integration: integration("slack"),
        message: {
          externalId: "slack:T123:1",
          data: { channel: { id: "C123" } },
        },
      })
    ).toMatchObject([
      {
        type: "message.created",
        match: { channel: "C123" },
      },
    ])
  })

  test("projects GitHub issue comments to created issue match", () => {
    expect(
      readJobEventsForMessage({
        integration: integration("github"),
        message: {
          externalId: "github:1:delivery",
          data: {
            action: "created",
            eventType: "issue_comment",
            repository: { fullName: "jori/app" },
            issueNumber: 42,
            isPullRequest: false,
          },
        },
      })
    ).toMatchObject([
      {
        type: "issue.comment.created",
        match: { repo: "jori/app", issue: "42" },
      },
    ])
  })

  test("projects GitHub pull request comments to edited pull request match", () => {
    expect(
      readJobEventsForMessage({
        integration: integration("github"),
        message: {
          externalId: "github:1:delivery",
          data: {
            action: "edited",
            eventType: "issue_comment",
            repository: { fullName: "jori/app" },
            issueNumber: 42,
            isPullRequest: true,
          },
        },
      })
    ).toMatchObject([
      {
        type: "pull_request.comment.edited",
        match: { repo: "jori/app", pr: "42" },
      },
    ])
  })
})

describe("review and Linear message job event projection", () => {
  test("projects GitHub review comments to pull request path match", () => {
    expect(
      readJobEventsForMessage({
        integration: integration("github"),
        message: {
          externalId: "github:1:review",
          data: {
            action: "edited",
            eventType: "pull_request_review_comment",
            repository: { fullName: "jori/app" },
            pullNumber: 12,
            comment: { path: "src/app.ts" },
          },
        },
      })
    ).toMatchObject([
      {
        type: "pull_request.review_comment.edited",
        match: { repo: "jori/app", pr: "12", path: "src/app.ts" },
      },
    ])
  })

  test("projects Linear created comments with team and project match", () => {
    expect(
      readJobEventsForMessage({
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
        match: {
          issue: "issue-id",
          team: "team-id",
          project: "project-id",
        },
      },
    ])
  })

  test("projects Linear updated comments as edited events", () => {
    expect(
      readJobEventsForMessage({
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
        match: {
          issue: "issue-id",
        },
      },
    ])
  })
})

function integration(integration: Doc<"integrations">["integration"]) {
  return { integration } as Pick<Doc<"integrations">, "integration">
}
