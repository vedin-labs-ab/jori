import { describe, expect, test } from "vitest"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { assemblePrompt } from "."

describe("GitHub automation prompts", () => {
  test("renders review comment target context", () => {
    const prompt = assemblePrompt(githubAutomationRuntimeInput()).context

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

function githubAutomationRuntimeInput() {
  const github = githubIntegration()

  return {
    type: "automation",
    artifact: null,
    instructions: "Reply with a short quip.",
    access: {
      integrations: [{ id: github._id, tools: ["github_add_issue_comment"] }],
      web: true,
    },
    run: {
      _id: "run",
      _creationTime: 0,
      tenantId: "tenant",
      automationId: "automation",
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
      tenantId: "tenant",
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
  return {
    _id: "github-integration",
    _creationTime: 0,
    tenantId: "tenant",
    integration: "github",
    scope: "tenant",
    externalId: "github-account",
    credentials: {},
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
