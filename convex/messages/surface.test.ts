import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import {
  messageActorIds,
  messageIdentifiers,
  messageMatchesReplyTargetIdentifier,
  messageReplyTargetIdentifier,
} from "./identifiers"
import { conversationScope, messageAudience, replyAddress } from "./surface"

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
      integration: "linear",
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
  test("detects GitHub and Linear Jori mentions", () => {
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
        message({ integration: "github", text: "Follow-up for Jori" }),
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

describe("conversation scope", () => {
  test("classifies audience scope per surface", () => {
    expect(
      conversationScope(
        message({ type: "message.channels" }),
        integration({ integration: "slack" })
      )
    ).toBe("organization")
    expect(
      conversationScope(
        message({ type: "message.groups" }),
        integration({ integration: "slack" })
      )
    ).toBe("conversation")
    expect(
      conversationScope(
        message({ type: "message.mpim" }),
        integration({ integration: "slack" })
      )
    ).toBe("conversation")
    expect(
      conversationScope(
        message({ type: "message.im" }),
        integration({ integration: "slack" })
      )
    ).toBe("person")
    expect(
      conversationScope(
        message({ integration: "github" }),
        integration({ integration: "github" })
      )
    ).toBe("organization")
    expect(
      conversationScope(
        message({ integration: "gmail" }),
        integration({ integration: "gmail" })
      )
    ).toBe("person")
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
    ).toEqual({
      type: "linear",
      target: { id: "comment-id", issueId: "ISS-1", type: "comment" },
    })
    expect(
      replyAddress(
        message({ integration: "linear", data: { issueId: "ISS-1" } }),
        "linear:thread:comment-id"
      )
    ).toEqual({
      type: "linear",
      target: { id: "comment-id", issueId: "ISS-1", type: "comment" },
    })
  })
})

function message(overrides: Partial<Doc<"messages">>) {
  return {
    _id: "message",
    _creationTime: 0,
    organizationId: "organization",
    integrationId: "integration",
    integration: "slack",
    externalId: "external",
    mentioned: false,
    conversationId: "conversation",
    text: "",
    type: "message.channels",
    createdAt: 0,
    ...overrides,
  } as Doc<"messages">
}

function integration(overrides: Partial<Doc<"integrations">>) {
  return {
    data: {},
    ...overrides,
  } as Doc<"integrations">
}
