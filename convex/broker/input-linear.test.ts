import { expect, test } from "vitest"
import { normalizeBrokerToolInput } from "./input"

test("broker input validation accepts Linear reaction targets", () => {
  expect(
    normalizeBrokerToolInput("linear_add_reaction", {
      emoji: "👍",
      target: { id: "comment-id", type: "comment" },
    })
  ).toEqual({
    emoji: "👍",
    target: { id: "comment-id", type: "comment" },
  })

  expect(
    normalizeBrokerToolInput("linear_add_reaction", {
      emoji: "🚀",
      target: { id: "issue-id", type: "issue" },
    })
  ).toMatchObject({ target: { id: "issue-id", type: "issue" } })
})

test("broker input validation rejects flat Linear reaction targets", () => {
  expect(() =>
    normalizeBrokerToolInput("linear_add_reaction", {
      commentId: "comment-id",
      emoji: "👍",
      issueId: "",
      projectUpdateId: "",
    })
  ).toThrow("linear_add_reaction.target is required")
})
