import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { type ToolPermission } from "../permissions/catalog"
import { createApprovalContinuationPrompt } from "./continuation"
import { assemblePrompt } from "./prompt"

describe("runtime prompts", () => {
  test.each([
    [
      "github",
      {
        repository: {
          id: 123,
          owner: "acme",
          name: "app",
          fullName: "acme/app",
        },
        issueNumber: 12,
        pullNumber: 12,
        comment: { id: "comment-id", kind: "issue_comment" },
      },
      "GitHub",
      "acme/app#12",
    ],
    [
      "linear",
      { issueId: "ISSUE-1", commentId: "comment-id" },
      "Linear",
      "ISSUE-1",
    ],
    ["slack", { channelId: "C123", ts: "123.456" }, "Slack", "C123"],
  ] as const)("renders %s message trigger target context", (provider, data, providerLabel, targetId) => {
    const prompt = assemblePrompt(runtimeInput(provider, data), [])

    expect(prompt.rendered).toContain(`Provider: ${providerLabel}`)
    expect(prompt.rendered).toContain(`Target ID: ${targetId}`)
    expect(prompt.rendered).toContain("Target metadata:")
  })

  test("renders GitHub tool inputs in message target metadata", () => {
    const prompt = assemblePrompt(
      runtimeInput("github", {
        repository: {
          id: 123,
          owner: "acme",
          name: "app",
          fullName: "acme/app",
        },
        issueNumber: 12,
        pullNumber: 12,
        comment: { id: "comment-id", kind: "issue_comment" },
      }),
      []
    )

    expect(prompt.rendered).toContain("Repository owner: acme")
    expect(prompt.rendered).toContain("Repository name: app")
    expect(prompt.rendered).toContain("Issue number: 12")
    expect(prompt.rendered).toContain("Pull request number: 12")
  })
})

describe("approval request prompts", () => {
  test("renders approval tool usage as the only approval request path", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channelId: "C123", ts: "123.456" }),
      [],
      [promptedTool()]
    )

    expect(prompt.rendered).toContain(
      "`request_tool_approval` sends the user-facing approval request and code."
    )
    expect(prompt.rendered).toContain(
      "Do not send a normal message asking for approval"
    )
  })
})

describe("approval continuation prompts", () => {
  test("renders continuation context", () => {
    const prompt = createApprovalContinuationPrompt(approvalContinuation())

    expect(prompt).toContain("# Approval Continuation")
    expect(prompt).toContain("Create the calendar event")
    expect(prompt).toContain("Found a time")
    expect(prompt).toContain("google_calendar_create_event")
    expect(prompt).toContain('"eventId": "event-123"')
    expect(prompt).toContain("Do not repeat the approved tool call")
  })
})

function runtimeInput(provider: "github" | "linear" | "slack", data: unknown) {
  return {
    type: "message",
    provider,
    trigger: {
      _id: "trigger",
      _creationTime: 0,
      tenantId: "tenant",
      type: "message",
      provider,
      status: "active",
      createdAt: 0,
    },
    integration: integration(provider),
    integrations: [integration(provider)],
    message: {
      _id: "message",
      _creationTime: 0,
      tenantId: "tenant",
      integrationId: `${provider}-integration`,
      externalId: "external-message",
      conversationId: "conversation",
      actorId: "actor",
      text: "Please help.",
      data,
      createdAt: 0,
    },
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

function integration(provider: string): Doc<"integrations"> {
  return {
    _id: `${provider}-integration`,
    _creationTime: 0,
    tenantId: "tenant",
    provider,
    scope: "tenant",
    accountId: `${provider}-account`,
    credentials: {},
    status: "active",
    createdAt: 0,
  } as Doc<"integrations">
}

function promptedTool(): ToolPermission {
  return {
    provider: "notion",
    tool: "notion_create_page",
    label: "Create Notion page",
    description: "Create a Notion page or database record.",
    access: "write",
    defaultMode: "prompted",
  }
}

function approvalContinuation() {
  return {
    handoff: {
      objective: "Create the calendar event and confirm it in Slack.",
      progress: "Found a time that works for the attendees.",
      next: "Tell the Slack thread the event was created.",
    },
    action: {
      provider: "googleCalendar",
      tool: "google_calendar_create_event",
      summary: "Create a 30 minute design review.",
      args: { title: "Design review" },
    },
    result: { eventId: "event-123" },
  }
}
