import { describe, expect, test } from "vitest"
import { getLinearMessage } from "./events"

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
