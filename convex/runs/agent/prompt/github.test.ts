import { describe, expect, test } from "vitest"
import { id } from "../../../../test/convex/database"
import { integrationDoc } from "../../../../test/convex/integrations"
import { type Doc } from "../../../_generated/dataModel"
import { assemblePrompt } from "."

describe("GitHub job prompts", () => {
  test("renders review comment target context", () => {
    const prompt = assemblePrompt(githubJobRuntimeInput()).context

    expect(prompt).toContain("- Type: pull_request.review_comment.edited")
    expect(prompt).toContain("- Integration: GitHub")
    expect(prompt).toContain("- Repository: acme/app")
    expect(prompt).toContain("- Pull request number: 12")
    expect(prompt).toContain("- Comment ID: 456")
    expect(prompt).toContain("- Comment kind: pull_request_review")
    expect(prompt).toContain("- Review thread comment ID: 123")
    expect(prompt).toContain("Text:\n```text\nThis is a great change.\n```")
  })
})

function githubJobRuntimeInput() {
  const github = githubIntegration()

  return {
    type: "job",
    instructions: "Reply with a short quip.",
    access: {
      integrations: [{ id: github._id, tools: ["github_add_issue_comment"] }],
      jori: ["web_search", "web_fetch"],
    },
    run: {
      _id: "run",
      _creationTime: 0,
      organizationId: "organization",
      job: { id: "job" },
      snapshot: {
        title: "GitHub quip",
        source: { type: "event", surface: "github" },
        context: [],
      },
      cause: { type: "event", eventId: "event" },
      createdAt: 0,
    },
    integration: github,
    integrations: [github],
    event: {
      _id: "event",
      _creationTime: 0,
      organizationId: "organization",
      integrationId: github._id,
      key: "github:delivery",
      type: "pull_request.review_comment.edited",
      match: { path: "README.md", pr: "12", repo: "acme/app" },
      text: "This is a great change.",
      data: {
        repository: { fullName: "acme/app" },
        pullNumber: 12,
        comment: {
          id: "456",
          inReplyToId: "123",
          kind: "pull_request_review",
        },
      },
    },
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

function githubIntegration(): Doc<"integrations"> {
  return integrationDoc({
    _id: id<"integrations">("github-integration"),
    integration: "github",
    externalId: "github-account",
  })
}
