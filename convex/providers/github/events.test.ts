import { describe, expect, test } from "vitest"
import { getGitHubMessage } from "./events"
import { type GitHubWebhookPayload } from "./types"

describe("GitHub webhook messages", () => {
  test("keeps issue comment action in the provider message type", () => {
    const message = getGitHubMessage({
      event: "issue_comment",
      deliveryId: null,
      payload: {
        action: "edited",
        installation: { id: 123 },
        repository: repository(),
        issue: {
          number: 42,
          pull_request: {},
        },
        comment: {
          id: 987,
          body: "Updated comment",
          updated_at: "2026-06-12T12:00:00Z",
        },
      },
    })

    expect(message).toMatchObject({
      type: "comment.pull_request.edited",
      externalId: "github:123:edited:987:2026-06-12T12:00:00Z",
      data: {
        action: "edited",
        eventType: "issue_comment",
      },
    })
  })
})

function repository(): GitHubWebhookPayload["repository"] {
  return {
    id: 1,
    owner: { login: "acme" },
    name: "app",
    full_name: "acme/app",
  }
}
