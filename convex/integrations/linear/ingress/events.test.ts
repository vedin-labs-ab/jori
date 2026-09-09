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
      externalId:
        "linear:org-id:comment:update:comment-id:2026-06-12T12:00:00Z",
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

test("deduplicates comment mentions across notification and data-change deliveries", () => {
  const comment = {
    id: "comment",
    issueId: "issue",
    body: "Please help",
    createdAt: "2026-09-09T12:00:00Z",
  }
  const standard = getLinearMessage({
    deliveryId: "comment-delivery",
    payload: {
      type: "Comment",
      action: "create",
      organizationId: "workspace",
      data: comment,
    },
  })
  const notified = getLinearMessage({
    deliveryId: "notification-delivery",
    payload: {
      type: "AppUserNotification",
      action: "issueCommentMention",
      organizationId: "workspace",
      appUserId: "bot",
      notification: {
        comment,
        issue: { id: "issue" },
        actor: { id: "person" },
      },
    },
  })
  expect(notified).toMatchObject({
    externalId: standard?.externalId,
    appUserId: "bot",
    mentioned: true,
    text: "Please help",
    actorId: "person",
  })
})

test("keeps issue notifications in their issue conversation", () => {
  const message = getLinearMessage({
    deliveryId: "mention-delivery",
    payload: {
      type: "AppUserNotification",
      action: "issueMention",
      organizationId: "workspace",
      appUserId: "bot",
      notification: {
        issue: { id: "issue", description: "Help with this issue" },
        actor: { id: "person" },
      },
    },
  })
  expect(message).toMatchObject({
    type: "issue.mention",
    conversationId: "issue",
    text: "Help with this issue",
    mentioned: true,
    appUserId: "bot",
    data: { commentId: undefined, action: undefined },
  })
})
