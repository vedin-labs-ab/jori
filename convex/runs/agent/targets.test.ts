import { describe, expect, test } from "vitest"
import { requireMessageTarget } from "./targets"

describe("runtime targets", () => {
  test("extracts GitHub comment targets", () => {
    expect(
      requireMessageTarget("github", {
        repository: { id: 123, owner: "acme", name: "app" },
        issueNumber: 12,
        comment: { id: "comment", kind: "issue_comment" },
      })
    ).toEqual({
      integration: "github",
      owner: "acme",
      repo: "app",
      repositoryId: 123,
      issueNumber: 12,
      pullNumber: undefined,
      commentId: "comment",
      commentKind: "issue_comment",
    })
  })

  test("extracts Linear issue targets", () => {
    expect(
      requireMessageTarget("linear", {
        issueId: "issue-id",
        commentId: "comment-id",
      })
    ).toEqual({
      integration: "linear",
      issueId: "issue-id",
      commentId: "comment-id",
    })
  })

  test("extracts Slack channel targets", () => {
    expect(requireMessageTarget("slack", { channel: { id: "C123" } })).toEqual({
      integration: "slack",
      channelId: "C123",
    })
  })

  test.each([
    ["github", "Missing GitHub comment target"],
    ["linear", "Missing Linear issue target"],
    ["slack", "Missing Slack channel target"],
  ] as const)("keeps %s target validation strict", (provider, message) => {
    expect(() => requireMessageTarget(provider, {})).toThrow(message)
  })
})
