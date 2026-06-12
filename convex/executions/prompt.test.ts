import { describe, expect, test } from "vitest"
import { assemblePrompt } from "./prompt"
import {
  approvalContinuation,
  automationRuntimeInput,
  githubId,
  promptedTool,
  runtimeInput,
} from "./prompt.fixtures"

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
    expect(prompt).toContain("The requester cannot see you working.")

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

describe("automation trigger prompts", () => {
  test("renders selected integration access", () => {
    const prompt = assemblePrompt(automationRuntimeInput())

    expect(prompt).toContain("An automation triggered this run.")
    expect(prompt).toContain("Current UTC time:")
    expect(prompt).toContain("Integration access:")
    expect(prompt).toContain("- Read scope: Selected integrations only")
    expect(prompt).toContain("- Web search: Allowed")
    expect(prompt).toContain("- GitHub: Read")
    expect(prompt).toContain("- Slack: Write")
    expect(prompt).toContain("Use write actions only")
    expect(prompt).toContain("Run the automation")
  })

  test("renders all connected read scope", () => {
    const prompt = assemblePrompt(automationRuntimeInput("all"))

    expect(prompt).toContain("- Read scope: All connected integrations")
  })

  test("renders disabled web search", () => {
    const prompt = assemblePrompt(automationRuntimeInput([githubId()], false))

    expect(prompt).toContain("- Web search: Disabled")
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
    expect(prompt).toContain("do not ask for approval in chat")
    expect(prompt).toContain("approves or denies the action")
  })

  test("omits the approvals section without prompted tools", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channelId: "C123", ts: "123.456" })
    )

    expect(prompt).not.toContain("# Approvals")
  })
})

describe("approval continuation prompts", () => {
  test("renders approved action results", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channelId: "C123", ts: "123.456" }),
      [promptedTool()],
      approvalContinuation()
    )

    expect(prompt).toContain("# Original Trigger")
    expect(prompt).toContain("# Approval Decision")
    expect(prompt).toContain("approved the action")
    expect(prompt).toContain("Create the calendar event")
    expect(prompt).toContain("Found a time")
    expect(prompt).toContain("google_calendar_create_event")
    expect(prompt).toContain('"eventId":"event-123"')
    expect(prompt).toContain("Do not repeat the approved action")
    expect(prompt).toContain("report what failed instead of retrying")
    expect(prompt).not.toContain("Handle the request")
  })

  test("renders denied action results", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channelId: "C123", ts: "123.456" }),
      [promptedTool()],
      approvalContinuation("denied")
    )

    expect(prompt).toContain("# Original Trigger")
    expect(prompt).toContain("# Approval Decision")
    expect(prompt).toContain("denied the action")
    expect(prompt).toContain("Do not run the denied action")
    expect(prompt).toContain("If a safe path remains, continue")
    expect(prompt).toContain('"code":"approval_denied"')
    expect(prompt).not.toContain("Handle the request")
  })
})
