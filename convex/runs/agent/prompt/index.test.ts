import { describe, expect, test } from "vitest"
import { assemblePrompt } from "."
import { promptedTool, runtimeInput } from "./fixtures"
import { runtimeSkills } from "./skill_fixtures"

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
    ["- Issue ID: issue-id", "- Comment ID: comment-id"],
  ],
  [
    "slack",
    { channel: { id: "C123" }, ts: "123.456" },
    "Slack",
    [
      "- Channel ID: C123",
      "- Message timestamp: 123.456",
      "- Thread timestamp: 123.456",
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
    expect(prompt).toContain(`Active surface: \`${toolSurfaceLabel}\``)
    expectRunBefore(prompt, "# Trigger")

    for (const line of targetLines) {
      expect(prompt).toContain(line)
    }

    expect(prompt).toContain(targetLines.join("\n"))
    expect(prompt).toContain("Recent messages:")
    expect(prompt).toContain("Current message:")
    expect(prompt).not.toContain("\nHistory:\n")
    expect(prompt).not.toContain("{{message.target}}")
    expect(prompt).toContain("- 1970-01-01T00:00:01.000Z | user | Albin Vedin")
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
      "- 1970-01-01T00:00:01.000Z | user | Albin Vedin | identifiers=[internal:message:message, slack:channel:C123, slack:message:123.456, slack:thread:123.456] | actor_ids=[slack:user:UACTOR]"
    )
    expect(prompt).toContain("@Milo what tools do u have?")
    expect(prompt).not.toContain("<@UBOT> what tools do u have?")
  })

  test("uses Slack message timestamp as the default reply thread", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("- Thread timestamp: 123.456")
    expect(prompt).not.toContain("- Thread timestamp: undefined")
    expect(prompt).not.toContain("- Reply thread timestamp:")
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
    expect(prompt).toContain("- Thread timestamp: 123.000")
  })
})

describe("runtime Linear prompt metadata", () => {
  test("renders Linear trigger text with actor and comment metadata", () => {
    const prompt = assemblePrompt(
      runtimeInput("linear", {
        commentId: "comment-id",
        issueId: "issue-id",
      })
    )

    expect(prompt).toContain(
      "- 1970-01-01T00:00:01.000Z | user | Albin Vedin | identifiers=[internal:message:message, linear:issue:issue-id, linear:comment:comment-id] | actor_ids=[linear:user:UACTOR]"
    )
    expect(prompt).not.toContain("identifiers=[]")
    expect(prompt).not.toContain("actor_ids=[]")
  })
})

describe("runtime delivery prompts", () => {
  test("renders start update guidance", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("Send a short heads-up with `send_reply`")
    expect(prompt).toContain("Make updates useful, not ceremonial")
    expect(prompt).toContain("After the heads-up, stay quiet")
    expect(prompt).toContain(
      "I’ll find the Notion parent first, then ask for approval"
    )
    expect(prompt).toContain("Looking up Emma now")
    expect(prompt).toContain("Bad:")
    expect(prompt).toContain("On it — I’ll keep you posted")
  })

  test("renders Slack communication and completion sections", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("use the lightest action that delivers it")
    expect(prompt).toContain("Use `send_reply`")
    expect(prompt).toContain("Active surface: `Slack`")
    expect(prompt).not.toContain("Current surface:")
    expect(prompt).toContain("# Finish")
    expect(prompt).toContain("Finish the run by calling `finish_run`")
    expect(prompt).toContain("No closing message is required")
    expectNoSyntheticBlankLines(prompt)
  })

  test.each(
    messageTriggerCases
  )("renders generic communication guidance for %s message runs", (provider, data) => {
    const prompt = assemblePrompt(runtimeInput(provider, data))

    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("use the lightest action that delivers it")
    expect(prompt).toContain("Use `send_reply`")
    expect(prompt).toContain("# Finish")
    expect(prompt).toContain("No closing message is required")
  })

  test("omits automatic final delivery instructions", () => {
    const prompt = assemblePrompt(githubMessageInput())

    expect(prompt).not.toMatch(/Milo will .*post it/)
    expect(prompt).not.toContain("Use GitHub write tools only")
    expect(prompt).not.toContain("not for routine replies")
    expect(prompt).not.toContain("The requester cannot see you working")
    expect(prompt).not.toContain("If a reply is useful, send it to this target")
  })
})

describe("output contract prompts", () => {
  test("renders the channel contract section", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("# Output")
    expect(prompt).toContain(
      "Everything that reaches the requester or any system happens through a tool call"
    )
    expect(prompt).toContain("outside a tool call reach no one")
  })
})

describe("approval request prompts", () => {
  test("lists prompted tools and the approval contract", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
      { promptedTools: [promptedTool()], skills: runtimeSkills() }
    )

    expect(prompt).toContain("# Approvals")
    expect(prompt).toContain("`notion_create_page`")
    expect(prompt).toContain("Include `approval.summary`")
    expect(prompt).toContain("key details needed to judge it")
    expect(prompt).not.toContain("approval.handoff")
    expect(prompt).toContain("Do not ask for approval in chat")
    expect(prompt).toContain("the run pauses on its own")
    expect(prompt).toContain("`denied`, `expired`, or `cancelled`")
    expect(prompt.indexOf("# Communication")).toBeLessThan(
      prompt.indexOf("# Approvals")
    )
    expect(prompt).toContain("Callbacks are not handled.\n\n# Approvals")
    expectNoSyntheticBlankLines(prompt)
  })

  test("omits the approvals section without prompted tools", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).not.toContain("# Approvals")
  })
})

function githubMessageInput() {
  return runtimeInput("github", {
    repository: { fullName: "acme/app" },
    issueNumber: 12,
    comment: { id: "comment-id", kind: "issue_comment" },
  })
}

function expectRunBefore(prompt: string, section: string) {
  expectSingleRun(prompt)
  expect(prompt.indexOf("# Voice")).toBeLessThan(prompt.indexOf("# Work"))
  expect(prompt.indexOf("# Work")).toBeLessThan(prompt.indexOf("# Security"))
  expect(prompt.indexOf("# Security")).toBeLessThan(prompt.indexOf("# Output"))
  expect(prompt.indexOf("# Output")).toBeLessThan(prompt.indexOf("# Finish"))
  expect(prompt.indexOf("# Finish")).toBeLessThan(prompt.indexOf("# Run"))
  expect(prompt.indexOf("# Run")).toBeLessThan(prompt.indexOf(section))
  expect(prompt.indexOf("Active surface:")).toBeLessThan(
    prompt.indexOf(section)
  )
  expect(prompt.indexOf("Run started at:")).toBeLessThan(
    prompt.indexOf(section)
  )
}

function expectSingleRun(prompt: string) {
  expect(prompt).toContain("# Run\n\nRun started at:")
  expect(prompt.match(/Run started at:/g)).toHaveLength(1)
}

function expectNoSyntheticBlankLines(prompt: string) {
  expect(prompt).not.toMatch(/\n{3,}/)
}
