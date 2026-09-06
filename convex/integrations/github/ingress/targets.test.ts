import { expect, test } from "vitest"
import { id } from "../../../../test/convex/database"
import { type Doc } from "../../../_generated/dataModel"
import { githubReactionTarget } from "./targets"

test("builds GitHub review comment reaction targets", () => {
  expect(
    githubReactionTarget(
      message({
        comment: {
          id: "987",
          kind: "pull_request_review",
        },
        pullNumber: 42,
      })
    )
  ).toEqual({
    path: "/repos/acme/app/pulls/comments/987/reactions",
    target: {
      conversationId: "acme/app#42",
      identifiers: [
        "github:repository:acme/app",
        "github:pull:acme/app#42",
        "github:comment:987",
      ],
      key: "github:comment:acme/app:987",
      text: "Jori reply.",
    },
  })
})

test("builds GitHub issue comment reaction targets", () => {
  expect(
    githubReactionTarget(
      message({
        comment: {
          id: "654",
          kind: "issue",
        },
        issueNumber: 12,
      })
    )
  ).toMatchObject({
    path: "/repos/acme/app/issues/comments/654/reactions",
    target: {
      identifiers: [
        "github:repository:acme/app",
        "github:issue:acme/app#12",
        "github:comment:654",
      ],
      key: "github:comment:acme/app:654",
    },
  })
})

function message(data: Record<string, unknown>): Doc<"messages"> {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    surface: "github",
    type: "comment.pull_request.created",
    externalId: "github:message",
    mentioned: false,
    actor: { externalId: "1", kind: "self", name: "jori[bot]" },
    conversationId: "acme/app#42",
    text: "Jori reply.",
    data: {
      repository: {
        fullName: "acme/app",
      },
      ...data,
    },
    createdAt: 0,
  }
}
