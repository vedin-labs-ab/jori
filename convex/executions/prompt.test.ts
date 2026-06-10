import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { type ToolPermission } from "../permissions/catalog"
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
      [
        "- Repository: acme/app",
        "- Issue number: 12",
        "- Pull request number: 12",
        "- Comment ID: comment-id",
        "- Comment kind: issue_comment",
      ],
    ],
    [
      "linear",
      { issueId: "ISSUE-1", commentId: "comment-id" },
      "Linear",
      ["- Issue ID: ISSUE-1", "- Comment ID: comment-id"],
    ],
    [
      "slack",
      { channelId: "C123", ts: "123.456" },
      "Slack",
      ["- Channel ID: C123", "- Message timestamp: 123.456"],
    ],
  ] as const)("renders %s message trigger target", (provider, data, providerLabel, targetLines) => {
    const prompt = assemblePrompt(runtimeInput(provider, data))

    expect(prompt).toContain(`A ${providerLabel} message triggered this run.`)
    expect(prompt).toContain("Current UTC time:")

    for (const line of targetLines) {
      expect(prompt).toContain(line)
    }

    expect(prompt).toContain("Handle the request.")
  })

  test("omits absent target fields", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channelId: "C123", ts: "123.456" })
    )

    expect(prompt).not.toContain("Thread timestamp")
  })
})

describe("schedule trigger prompts", () => {
  test("renders the publish target and omits an absent thread", () => {
    const prompt = assemblePrompt(scheduledRuntimeInput())

    expect(prompt).toContain("A schedule triggered this run.")
    expect(prompt).toContain("Current UTC time:")
    expect(prompt).toContain("- Provider: Slack")
    expect(prompt).toContain("- Channel ID: C123")
    expect(prompt).not.toContain("Thread timestamp")
    expect(prompt).toContain("Run the scheduled work")
  })

  test("renders the publish thread when present", () => {
    const prompt = assemblePrompt(scheduledRuntimeInput("123.456"))

    expect(prompt).toContain("- Thread timestamp: 123.456")
  })
})

describe("approval request prompts", () => {
  test("lists prompted tools and the approval contract", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channelId: "C123", ts: "123.456" }),
      [promptedTool()]
    )

    expect(prompt).toContain("# Approvals")
    expect(prompt).toContain("notion_create_page")
    expect(prompt).toContain("never ask for approval in a chat message")
  })

  test("omits the approvals section without prompted tools", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channelId: "C123", ts: "123.456" })
    )

    expect(prompt).not.toContain("# Approvals")
  })
})

describe("approval continuation prompts", () => {
  test("replaces the trigger directive with the continuation", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channelId: "C123", ts: "123.456" }),
      [promptedTool()],
      approvalContinuation()
    )

    expect(prompt).toContain("# Original Trigger")
    expect(prompt).toContain("# Approval Continuation")
    expect(prompt).toContain("Create the calendar event")
    expect(prompt).toContain("Found a time")
    expect(prompt).toContain("google_calendar_create_event")
    expect(prompt).toContain('"eventId":"event-123"')
    expect(prompt).toContain("Do not repeat the approved tool call")
    expect(prompt).toContain("report what failed instead of retrying")
    expect(prompt).not.toContain("Handle the request")
  })
})

function scheduledRuntimeInput(threadId?: string) {
  return {
    type: "scheduled",
    trigger: {
      _id: "trigger",
      _creationTime: 0,
      tenantId: "tenant",
      type: "scheduled",
      status: "active",
      createdAt: 0,
    },
    integration: integration("slack"),
    integrations: [integration("slack")],
    schedule: {
      _id: "schedule",
      _creationTime: 0,
      tenantId: "tenant",
      name: "Daily digest",
      description: "Post the daily digest.",
      metadata: { source: "daily" },
      output: {
        type: "slack",
        channelId: "C123",
        ...(threadId === undefined ? {} : { threadId }),
      },
      type: "recurring",
      cron: "0 9 * * *",
      status: "active",
      createdAt: 0,
      updatedAt: 0,
    },
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

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
    externalId: `${provider}-account`,
    credentials: {},
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
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
