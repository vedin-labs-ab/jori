import { describe, expect, test } from "vitest"
import { getLinearMessage, getLinearReaction } from "./events"

describe("Linear webhook messages", () => {
  test("keeps comment action in the provider message type", () => {
    const message = getLinearMessage({
      deliveryId: null,
      payload: {
        action: "update",
        type: "Comment",
        organizationId: "org-id",
        data: {
          id: "comment-id",
          parentId: "parent-comment-id",
          issueId: "issue-id",
          body: "Updated comment",
          updatedAt: "2026-06-12T12:00:00Z",
        },
      },
    })

    expect(message).toMatchObject({
      type: "comment.update",
      externalId: "linear:org-id:update:comment-id:2026-06-12T12:00:00Z",
      data: {
        action: "update",
        eventType: "Comment",
        parentCommentId: "parent-comment-id",
      },
    })
  })
})

describe("Linear webhook reactions", () => {
  test("normalizes app user comment reaction notifications", () => {
    const reaction = getLinearReaction({
      deliveryId: "delivery-id",
      payload: {
        type: "AppUserNotification",
        action: "issueCommentReaction",
        organizationId: "org-id",
        appUserId: "bot-id",
        createdAt: "2026-06-12T12:00:00Z",
        notification: {
          emoji: "✅",
          actor: {
            id: "user-id",
            name: "Albin",
            email: "albin@example.com",
          },
          issue: { id: "issue-id" },
          comment: {
            id: "comment-id",
            body: "I can proceed with option B.",
          },
        },
      },
    })

    expect(reaction).toMatchObject({
      action: "added",
      actorId: "user-id",
      reaction: "✅",
      target: {
        key: "linear:comment:comment-id",
        identifiers: ["linear:issue:issue-id", "linear:comment:comment-id"],
        actorId: "bot-id",
        conversationId: "issue-id",
        text: "I can proceed with option B.",
      },
    })
  })
})
