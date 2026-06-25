import { describe, expect, test } from "vitest"
import { assemblePrompt } from "."
import { runtimeInput } from "./fixtures"

describe("runtime skill prompts", () => {
  test("lists loadable skills without loading unrelated skill bodies", () => {
    const prompt = assemblePrompt(
      runtimeInput("github", {
        repository: { fullName: "acme/app" },
        issueNumber: 12,
        comment: { id: "comment-id", kind: "issue_comment" },
      })
    )

    expect(prompt).toContain("# Skills")
    expect(prompt).toContain("Use `load_skill`")
    expect(prompt).toContain("`image-generation`: Generate Milo image assets")
    expect(prompt).toContain("`slack`: Format Slack replies")
    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("worded `send_reply`")
    expect(prompt).not.toContain("## Guidance")
    expect(prompt).not.toContain("Do not use app-callback controls")
  })

  test("eagerly loads Slack guidance for Slack final replies", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("default to the lightest touch that lands it")
    expect(prompt).toContain("outside a tool call reach no one")
    expect(prompt).toContain("No closing message is required")
    expect(prompt).toContain("Active surface: `Slack`")
    expect(prompt).not.toContain("Current surface:")
    expect(prompt).toContain("## Guidance")
    expect(prompt).toContain("# Skills")
    expect(prompt).toContain("Available skills:")
    expect(prompt).toContain("Use `load_skill`")
    expect(prompt).toContain("`image-generation`: Generate Milo image assets")
    expect(prompt).not.toContain("`slack`: Format Slack replies")
    expect(prompt.indexOf("# Communication")).toBeLessThan(
      prompt.indexOf("# Updates")
    )
    expect(prompt).toContain("Format Slack messages with Slack `mrkdwn`")
    expect(prompt).toContain(
      "Escape literal `&`, `<`, and `>` unless they are part of valid Slack syntax.\n\nChoose the clearest Slack form for the communication."
    )
    expect(prompt).toContain(
      "Use Slack `blocks` when structure makes the message easier to scan"
    )
    expect(prompt).toContain("Never use interactive Slack surfaces or controls")
    expect(prompt).not.toContain("## Slack")
    expect(prompt).not.toContain("### Text")
    expect(prompt).not.toContain("## Format")
    expect(prompt).not.toContain("Output contract:")
  })
})
