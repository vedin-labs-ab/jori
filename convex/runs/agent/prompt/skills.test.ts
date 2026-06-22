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
    expect(prompt).toContain("`slack`: Format Slack replies")
    expect(prompt).not.toContain("# Communication")
    expect(prompt).not.toContain("## Guidance")
    expect(prompt).not.toContain("Do not use app-callback controls")
  })

  test("eagerly loads Slack guidance for Slack final replies", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("Write for the reply surface.")
    expect(prompt).toContain("Assistant completion text is private run output")
    expect(prompt).toContain("call the appropriate communication tool")
    expect(prompt).toContain("Surface: `Slack`")
    expect(prompt).toContain("## Guidance")
    expect(prompt).not.toContain("# Skills")
    expect(prompt).not.toContain("Available skills:")
    expect(prompt).not.toContain("Use `load_skill`")
    expect(prompt).not.toContain("`slack`: Format Slack replies")
    expect(prompt.indexOf("Write for the reply surface.")).toBeLessThan(
      prompt.indexOf("Surface: `Slack`")
    )
    expect(prompt).toContain("Format Slack messages with Slack `mrkdwn`")
    expect(prompt).toContain(
      "Use Slack `blocks` when native structure makes the message easier to scan."
    )
    expect(prompt).toContain("Never use interactive Slack surfaces or controls")
    expect(prompt).not.toContain("## Slack")
    expect(prompt).not.toContain("### Text")
    expect(prompt).not.toContain("## Format")
    expect(prompt).not.toContain("Output contract:")
  })
})
