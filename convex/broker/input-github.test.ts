import { expect, test } from "vitest"
import { normalizeBrokerToolInput } from "./input"

test("broker input validation accepts GitHub reaction targets", () => {
  expect(
    normalizeBrokerToolInput("github_add_reaction", {
      content: "+1",
      owner: "acme",
      repo: "app",
      target: { issueNumber: 12, type: "issue" },
    })
  ).toMatchObject({ target: { issueNumber: 12, type: "issue" } })

  expect(
    normalizeBrokerToolInput("github_add_reaction", {
      content: "eyes",
      owner: "acme",
      repo: "app",
      target: { commentId: 456, type: "issue_comment" },
    })
  ).toMatchObject({ target: { commentId: 456, type: "issue_comment" } })

  expect(
    normalizeBrokerToolInput("github_add_reaction", {
      content: "heart",
      owner: "acme",
      repo: "app",
      target: { commentId: 789, type: "pull_request_review_comment" },
    })
  ).toMatchObject({
    target: { commentId: 789, type: "pull_request_review_comment" },
  })
})

test("broker input validation rejects unsupported GitHub reactions", () => {
  expect(() =>
    normalizeBrokerToolInput("github_add_reaction", {
      content: "thumbsup",
      owner: "acme",
      repo: "app",
      target: { issueNumber: 12, type: "issue" },
    })
  ).toThrow("github_add_reaction.content must be one of")
})

test("broker input validation rejects mismatched GitHub reaction targets", () => {
  expect(() =>
    normalizeBrokerToolInput("github_add_reaction", {
      content: "+1",
      owner: "acme",
      repo: "app",
      target: { commentId: 456, type: "issue" },
    })
  ).toThrow("github_add_reaction.target must match one supported shape")
})
