import { describe, expect, test } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  messageActorIds,
  messageIdentifiers,
  messageMatchesReplyTargetIdentifier,
  messageReplyTargetIdentifier,
} from "./identifiers"
import { conversationScope, messageAudience } from "./surface"
import { replyAddress } from "./targets"

describe("Slack message identifiers", () => {
  test("exposes Slack actor and message identifiers when available", () => {
    expect(
      messageActorIds(
        message({
          actor: { externalId: "U123", kind: "person", name: "Albin" },
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
})

describe("Linear message identifiers", () => {
  test("exposes Linear issue comment identifiers when available", () => {
    const linearMessage = message({
      actor: { externalId: "linear-user-id", kind: "person", name: "Albin" },
      data: {
        commentId: "comment-id",
        issueId: "issue-id",
      },
      surface: "linear",
    })

    expect(messageActorIds(linearMessage)).toEqual([
      "linear:user:linear-user-id",
    ])
    expect(messageIdentifiers(linearMessage)).toEqual([
      "internal:message:message",
      "linear:issue:issue-id",
      "linear:comment:comment-id",
    ])
    expect(messageReplyTargetIdentifier(linearMessage)).toBe(
      "linear:issue:issue-id"
    )
    expect(
      messageMatchesReplyTargetIdentifier(
        linearMessage,
        "linear:thread:comment-id"
      )
    ).toBe(true)
  })

  test("exposes Linear subcomment identifiers when available", () => {
    const linearMessage = message({
      actor: { externalId: "linear-user-id", kind: "person", name: "Albin" },
      data: {
        commentId: "reply-id",
        issueId: "issue-id",
        parentCommentId: "thread-id",
      },
      surface: "linear",
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

describe("console message identifiers", () => {
  test("carries only the internal identifier and no provider actor ids", () => {
    const consoleMessage = message({
      actor: { kind: "person", personId: "person" as Id<"persons"> },
      conversationId: "conversation-id",
      integrationId: undefined,
      surface: "console",
      type: "console.message",
    })

    expect(messageIdentifiers(consoleMessage)).toEqual([
      "internal:message:message",
    ])
    expect(messageActorIds(consoleMessage)).toEqual([])
    expect(messageReplyTargetIdentifier(consoleMessage)).toBeNull()
  })
})

describe("message surface audience", () => {
  test("detects GitHub and Linear Jori mentions", () => {
    expect(
      messageAudience(message({ surface: "github", mentioned: true }))
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(
      messageAudience(message({ surface: "linear", mentioned: true }))
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(
      messageAudience(
        message({ surface: "github", text: "Follow-up for Jori" })
      )
    ).toMatchObject({ isAddressed: false, isDirect: false })
  })

  test("treats Slack mentions and direct messages as addressed separately", () => {
    expect(
      messageAudience(message({ mentioned: true, type: "message.channels" }))
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(messageAudience(message({ type: "message.im" }))).toMatchObject({
      isAddressed: true,
      isDirect: true,
    })
  })

  test("treats every console message as a direct address", () => {
    expect(
      messageAudience(message({ surface: "console", type: "console.message" }))
    ).toEqual({ isAddressed: true, isDirect: true, isMentioned: true })
  })
})

describe("conversation scope", () => {
  test("classifies audience scope per surface", () => {
    expect(conversationScope(message({ type: "message.channels" }))).toBe(
      "organization"
    )
    expect(conversationScope(message({ type: "message.groups" }))).toBe(
      "conversation"
    )
    expect(conversationScope(message({ type: "message.mpim" }))).toBe(
      "conversation"
    )
    expect(conversationScope(message({ type: "message.im" }))).toBe("person")
    expect(conversationScope(message({ surface: "github" }))).toBe(
      "organization"
    )
    expect(conversationScope(message({ surface: "console" }))).toBe("person")
  })
})

describe("message surface targets", () => {
  test("resolves GitHub and Linear reply targets", () => {
    expect(
      replyAddress(
        message({
          surface: "github",
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
      replyAddress(message({ surface: "linear", data: { issueId: "ISS-1" } }))
    ).toEqual({ type: "linear", target: { id: "ISS-1", type: "issue" } })
    expect(
      replyAddress(
        message({
          surface: "linear",
          data: { issueId: "ISS-1", parentCommentId: "comment-id" },
        })
      )
    ).toEqual({
      type: "linear",
      target: { id: "comment-id", issueId: "ISS-1", type: "comment" },
    })
    expect(
      replyAddress(
        message({ surface: "linear", data: { issueId: "ISS-1" } }),
        "linear:thread:comment-id"
      )
    ).toEqual({
      type: "linear",
      target: { id: "comment-id", issueId: "ISS-1", type: "comment" },
    })
  })

  test("replies to a console message in its own conversation", () => {
    expect(
      replyAddress(
        message({ surface: "console", conversationId: "conversation-id" })
      )
    ).toEqual({ type: "console", conversationId: "conversation-id" })
    expect(
      replyAddress(
        message({ surface: "console", conversationId: "conversation-id" }),
        "linear:thread:comment-id"
      )
    ).toBeNull()
  })
})

function message(overrides: Partial<Doc<"messages">>) {
  return {
    _id: "message",
    _creationTime: 0,
    organizationId: "organization",
    integrationId: "integration",
    surface: "slack",
    externalId: "external",
    mentioned: false,
    conversationId: "conversation",
    text: "",
    type: "message.channels",
    createdAt: 0,
    ...overrides,
  } as Doc<"messages">
}
