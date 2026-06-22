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
    expectContextBefore(prompt, "# Trigger")

    for (const line of targetLines) {
      expect(prompt).toContain(line)
    }

    expect(prompt).toContain("Recent messages:")
    expect(prompt).toContain("Current message:")
    expect(prompt).not.toContain("\nHistory:\n")
    expect(prompt).toContain("- 1970-01-01T00:00:01.000Z | user | Albin Vedin")
    expect(prompt).toContain("Report the result back to this thread")
  })

  test("renders Slack trigger text with actor metadata and readable Milo mention", () => {
    const input = runtimeInput("slack", {
      channel: { id: "C123" },
      ts: "123.456",
    })

    if (input.type !== "message") {
      throw new Error("Expected message input.")
    }

    input.message.text = "<@UBOT> what tools do u have?"

    const prompt = assemblePrompt(input)

    expect(prompt).toContain(
      "- 1970-01-01T00:00:01.000Z | user | Albin Vedin | slack_id=UACTOR"
    )
    expect(prompt).toContain("@Milo what tools do u have?")
    expect(prompt).not.toContain("<@UBOT> what tools do u have?")
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
})

describe("runtime delivery prompts", () => {
  test("omits automatic final delivery instructions", () => {
    const prompt = assemblePrompt(githubMessageInput())

    expect(prompt).not.toMatch(/Milo will .*post it/)
    expect(prompt).not.toContain("Use GitHub write tools only")
    expect(prompt).not.toContain("not for routine replies")
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
    expectSingleContext(prompt)
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

function githubMessageInput() {
  return runtimeInput("github", {
    repository: { fullName: "acme/app" },
    issueNumber: 12,
    comment: { id: "comment-id", kind: "issue_comment" },
  })
}

function expectContextBefore(prompt: string, section: string) {
  expectSingleContext(prompt)
  expect(prompt.indexOf("## Voice")).toBeLessThan(prompt.indexOf("## Context"))
  expect(prompt.indexOf("## Context")).toBeLessThan(
    prompt.indexOf("## Principles")
  )
  expect(prompt.indexOf("Run started at:")).toBeLessThan(
    prompt.indexOf(section)
  )
}

function expectSingleContext(prompt: string) {
  expect(prompt).toContain("## Context\n\nRun started at:")
  expect(prompt.match(/Run started at:/g)).toHaveLength(1)
}
