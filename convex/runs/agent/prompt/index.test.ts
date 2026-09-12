import { describe, expect, test } from "vitest"
import { promptedTool, runtimeInput } from "../../../../test/convex/prompt"
import { runtimeSkills } from "../../../../test/convex/skills"
import { assemblePrompt } from "."

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
      "- Issue key: ISSUE-1",
      "- Issue title: Ship target context",
      "- Issue URL: https://linear.app/acme/issue/ISSUE-1/ship-target-context",
      "- Comment URL: https://linear.app/acme/issue/ISSUE-1/ship-target-context#comment-id",
    ],
  ],
  ["slack", { channel: { id: "C123" }, ts: "123.456" }, "Slack", []],
] as const

describe("runtime prompts", () => {
  test.each(messageTriggerCases)(
    "renders %s message trigger target",
    (provider, data, toolSurfaceLabel, targetLines) => {
      const prompt = assemblePrompt(runtimeInput(provider, data)).context

      expect(prompt).toContain(
        `A ${toolSurfaceLabel} message triggered this run.`
      )
      expect(prompt).toContain(`Active surface: \`${toolSurfaceLabel}\``)
      expectRunBefore(prompt, "# Trigger")

      if (targetLines.length === 0) {
        expect(prompt).not.toContain("Target:")
      } else {
        expect(prompt).toContain("Target:")
        expect(prompt).toContain(targetLines.join("\n"))
      }

      expect(prompt).toContain("Current message:")
      expect(prompt).not.toContain("{{message.target}}")
      expect(prompt).toContain(
        "- 1970-01-01T00:00:01.000Z | person | Albin Vedin"
      )
    }
  )

  test("renders Slack trigger text with actor metadata", () => {
    const input = runtimeInput("slack", {
      channel: { id: "C123" },
      ts: "123.456",
    })

    if (input.type !== "message") {
      throw new Error("Expected message input.")
    }

    // Message text is humanized at the provider edge before it is stored.
    input.message.text = "@Jori what tools do u have?"

    const prompt = assemblePrompt(input).context

    expect(prompt).toContain(
      "- 1970-01-01T00:00:01.000Z | person | Albin Vedin | identifiers=[internal:message:message, slack:channel:C123, slack:message:123.456, slack:thread:123.456] | actor_ids=[slack:user:UACTOR]"
    )
    expect(prompt).toContain("@Jori what tools do u have?")
  })

  test("keeps Slack thread routing in message identifiers, not a target block", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", {
        channel: { id: "C123" },
        thread: { ts: "123.000" },
        ts: "123.456",
      })
    ).context

    expect(prompt).toContain("slack:message:123.456")
    expect(prompt).toContain("slack:thread:123.000")
    expect(prompt).not.toContain("Target:")
  })
})

describe("runtime Linear prompt metadata", () => {
  test("renders Linear trigger text with actor and comment metadata", () => {
    const prompt = assemblePrompt(
      runtimeInput("linear", {
        commentId: "comment-id",
        issueId: "issue-id",
      })
    ).context

    expect(prompt).toContain(
      "- 1970-01-01T00:00:01.000Z | person | Albin Vedin | identifiers=[internal:message:message, linear:issue:issue-id, linear:comment:comment-id] | actor_ids=[linear:user:UACTOR]"
    )
  })
})

describe("runtime delivery prompts", () => {
  test("renders start update guidance", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    ).instructions

    expect(prompt).toContain(
      "send one `send_reply` before the first non-communication tool call"
    )
    expect(prompt).toContain("After that first signal, stay quiet")
    expect(prompt).toContain(
      "A heads-up that could sit unchanged under any other task says nothing."
    )
  })

  test.each(messageTriggerCases)(
    "renders communication and completion sections for %s message runs",
    (provider, data) => {
      const instructions = assemblePrompt(
        runtimeInput(provider, data)
      ).instructions

      expect(instructions).toContain("# Communication")
      expect(instructions).toContain("use the lightest action that delivers it")
      expect(instructions).toContain("plain closure usually get no response")
      expect(instructions).toContain("Use `send_reply`")
      expect(instructions).not.toContain("Current surface:")
      expect(instructions).toContain("# Finish")
      expect(instructions).toContain(
        "Finish the run when no useful work remains: prefer setting `final: true` on the last useful tool call that supports it, and call `finish_run` otherwise."
      )
      expectInstructionsOrder(instructions)
      expect(instructions).not.toMatch(/\n{3,}/)
    }
  )
})

describe("output contract prompts", () => {
  test("renders the channel contract in the opening", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    ).instructions

    expect(prompt).not.toContain("# Output")
    expect(prompt).toContain(
      "Only tool calls reach the requester or any system"
    )
    expect(prompt).toContain("words outside a tool call are discarded")
    expect(
      prompt.indexOf("words outside a tool call are discarded")
    ).toBeLessThan(prompt.indexOf("# Voice"))
  })
})

describe("approval request prompts", () => {
  test("lists prompted tools and the approval contract", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
      { promptedTools: [promptedTool()], skills: runtimeSkills() }
    ).instructions

    expect(prompt).toContain("# Approvals")
    expect(prompt).toContain("`notion_create_page`")
    expect(prompt).toContain("require the requester's approval before they run")
    expect(prompt).not.toContain("`approval.summary`")
    expect(prompt).not.toContain("approval.handoff")
    expect(prompt).toContain("do not ask for approval in chat")
    expect(prompt).toContain("the run pauses on its own")
    expect(prompt).toContain("`denied`, `expired`, or `cancelled`")
    expect(prompt.indexOf("# Communication")).toBeLessThan(
      prompt.indexOf("# Approvals")
    )
    expect(prompt).not.toMatch(/\n{3,}/)
  })

  test("omits the approvals section without prompted tools", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    ).instructions

    expect(prompt).not.toContain("# Approvals")
  })
})

function expectRunBefore(prompt: string, section: string) {
  expectSingleRun(prompt)
  expect(prompt.indexOf("# Run")).toBeLessThan(prompt.indexOf(section))
  expect(prompt.indexOf("Active surface:")).toBeLessThan(
    prompt.indexOf(section)
  )
  expect(prompt.indexOf("Run started at:")).toBeLessThan(
    prompt.indexOf(section)
  )
}

function expectSingleRun(prompt: string) {
  expect(prompt).toContain("# Run\n\nRun ID: run\nRun started at:")
  expect(prompt.match(/Run ID:/g)).toHaveLength(1)
  expect(prompt.match(/Run started at:/g)).toHaveLength(1)
}

function expectInstructionsOrder(prompt: string) {
  expect(prompt.indexOf("# Voice")).toBeLessThan(prompt.indexOf("# Work"))
  expect(prompt.indexOf("# Work")).toBeLessThan(prompt.indexOf("# Security"))
  expect(prompt.indexOf("# Security")).toBeLessThan(prompt.indexOf("# Finish"))
  expect(prompt).not.toContain("# Output")
  expect(prompt).not.toContain("# Run")
  expect(prompt).not.toContain("# Trigger")
}
