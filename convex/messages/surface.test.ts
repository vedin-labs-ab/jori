import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import {
  messageActorIds,
  messageIdentifiers,
  messageReplyTargetIdentifier,
} from "./identifiers"
import { messageAudience, messageText, replyAddress } from "./surface"

describe("message surface text", () => {
  test("replaces Milo's Slack mention with a readable name", () => {
    expect(
      messageText(
        message({
          text: "<@U0B96KZ7WJG> hello <@UOTHER>",
        }),
        integration({ data: { botUserId: "U0B96KZ7WJG" } })
      )
    ).toBe("@Milo hello <@UOTHER>")
  })

  test("handles Slack mention labels", () => {
    expect(
      messageText(
        message({
          text: "<@U0B96KZ7WJG|milo> hello",
        }),
        integration({ data: { botUserId: "U0B96KZ7WJG" } })
      )
    ).toBe("@Milo hello")
  })

  test("exposes Slack actor and message identifiers when available", () => {
    expect(
      messageActorIds(
        message({
          actor: { externalId: "U123", kind: "user", name: "Albin" },
        })
      )
    ).toEqual(["slack:user:U123"])
    expect(
      messageIdentifiers(message({ data: { ts: "1782231485.491049" } }))
    ).toEqual([
      "internal:message:message",
      "slack:message:1782231485.491049",
      "slack:thread:1782231485.491049",
    ])
  })

  test("exposes Linear actor and comment identifiers when available", () => {
    const linearMessage = message({
      actor: { externalId: "linear-user-id", kind: "user", name: "Albin" },
      data: {
        commentId: "reply-id",
        issueId: "issue-id",
        parentCommentId: "thread-id",
      },
      integration: "linear",
    })

    expect(messageActorIds(linearMessage)).toEqual([
      "linear:user:linear-user-id",
    ])
    expect(messageIdentifiers(linearMessage)).toEqual([
      "internal:message:message",
      "linear:issue:issue-id",
      "linear:comment:reply-id",
      "linear:thread:thread-id",
    ])
    expect(messageReplyTargetIdentifier(linearMessage)).toBe(
      "linear:thread:thread-id"
    )
  })
})

describe("message surface audience", () => {
  test("detects GitHub and Linear Milo mentions", () => {
    expect(
      messageAudience(
        message({ integration: "github", mentioned: true }),
        integration({})
      )
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(
      messageAudience(
        message({ integration: "linear", mentioned: true }),
        integration({})
      )
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(
      messageAudience(
        message({ integration: "github", text: "Follow-up for Milo" }),
        integration({})
      )
    ).toMatchObject({ isAddressed: false, isDirect: false })
  })

  test("treats Slack mentions and direct messages as addressed separately", () => {
    expect(
      messageAudience(
        message({ mentioned: true, type: "message.channels" }),
        integration({})
      )
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(
      messageAudience(message({ type: "message.im" }), integration({}))
    ).toMatchObject({ isAddressed: true, isDirect: true })
  })
})

describe("message surface targets", () => {
  test("resolves GitHub and Linear reply targets", () => {
    expect(
      replyAddress(
        message({
          integration: "github",
          data: {
            repository: { fullName: "acme/app" },
            issueNumber: 12,
          },
        })
      )
    ).toEqual({
      type: "github",
      kind: "issue",
      owner: "acme",
      repo: "app",
      issueNumber: 12,
    })
    expect(
      replyAddress(
        message({ integration: "linear", data: { issueId: "ISS-1" } })
      )
    ).toEqual({ type: "linear", target: { id: "ISS-1", type: "issue" } })
    expect(
      replyAddress(
        message({
          integration: "linear",
          data: { issueId: "ISS-1", parentCommentId: "comment-id" },
        })
      )
    ).toEqual({ type: "linear", target: { id: "comment-id", type: "comment" } })
    expect(
      replyAddress(
        message({ integration: "linear" }),
        "linear:thread:comment-id"
      )
    ).toEqual({ type: "linear", target: { id: "comment-id", type: "comment" } })
  })
})

function message(overrides: Partial<Doc<"messages">>) {
  return {
    _id: "message",
    integration: "slack",
    mentioned: false,
    text: "",
    type: "message.channels",
    ...overrides,
  } as Doc<"messages">
}

function integration(overrides: Partial<Doc<"integrations">>) {
  return {
    data: {},
    ...overrides,
  } as Doc<"integrations">
}
