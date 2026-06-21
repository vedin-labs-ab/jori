import { describe, expect, test } from "vitest"
import { assemblePrompt } from "."
import { approvalContinuation, promptedTool, runtimeInput } from "./fixtures"

const messageTriggerCases = [
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
    {
      issueId: "issue-id",
      issueIdentifier: "ISSUE-1",
      issue: {
        title: "Ship target context",
        url: "https://linear.app/acme/issue/ISSUE-1/ship-target-context",
      },
      commentId: "comment-id",
      url: "https://linear.app/acme/issue/ISSUE-1/ship-target-context#comment-id",
    },
    "Linear",
    [
      "- Issue ID: issue-id",
      "- Issue key: ISSUE-1",
      "- Issue title: Ship target context",
      "- Issue URL: https://linear.app/acme/issue/ISSUE-1/ship-target-context",
      "- Comment ID: comment-id",
      "- Comment URL: https://linear.app/acme/issue/ISSUE-1/ship-target-context#comment-id",
    ],
  ],
  [
    "slack",
    { channel: { id: "C123" }, ts: "123.456" },
    "Slack",
    [
      "- Channel ID: C123",
      "- Message timestamp: 123.456",
      "- Reply thread timestamp: 123.456",
    ],
  ],
] as const

describe("runtime prompts", () => {
  test.each(
    messageTriggerCases
  )("renders %s message trigger target", (provider, data, toolSurfaceLabel, targetLines) => {
    const prompt = assemblePrompt(runtimeInput(provider, data))

    expect(prompt).toContain(
      `A ${toolSurfaceLabel} message triggered this run.`
    )
    expect(prompt).toContain("Current UTC time:")

    expect(prompt).toContain(
      `${toolSurfaceLabel} already has the intake reply state`
    )

    for (const line of targetLines) {
      expect(prompt).toContain(line)
    }

    expect(prompt).toContain("Handle the request.")
  })

  test("uses Slack message timestamp as the default reply thread", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("- Reply thread timestamp: 123.456")
    expect(prompt).not.toContain("- Reply thread timestamp: undefined")
  })

  test("uses Slack thread timestamp when the trigger is already threaded", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", {
        channel: { id: "C123" },
        thread: { ts: "123.000" },
        ts: "123.456",
      })
    )

    expect(prompt).toContain("- Message timestamp: 123.456")
    expect(prompt).toContain("- Reply thread timestamp: 123.000")
  })

  test("tells message runs that final delivery is automatic", () => {
    const prompt = assemblePrompt(
      runtimeInput("github", {
        repository: { fullName: "acme/app" },
        issueNumber: 12,
        comment: { id: "comment-id", kind: "issue_comment" },
      })
    )

    expect(prompt).toContain("Milo will post it as a reply")
    expect(prompt).toContain("Use GitHub write tools only")
    expect(prompt).toContain("not for routine replies")
    expect(prompt).not.toContain("The requester cannot see you working")
    expect(prompt).not.toContain("If a reply is useful, send it to this target")
  })
})

describe("approval request prompts", () => {
  test("lists prompted tools and the approval contract", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
      [promptedTool()]
    )

    expect(prompt).toContain("# Approvals")
    expect(prompt).toContain("notion_create_page")
    expect(prompt).toContain("do not ask for approval in chat")
    expect(prompt).toContain("approves or denies the action")
  })

  test("omits the approvals section without prompted tools", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).not.toContain("# Approvals")
  })
})

describe("approval continuation prompts", () => {
  test("renders approved action results", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
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
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
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
