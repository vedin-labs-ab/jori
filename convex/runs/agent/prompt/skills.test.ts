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
    expect(prompt).not.toContain("## Communication")
    expect(prompt).not.toContain("Do not use app-callback controls")
  })

  test("eagerly loads Slack guidance for Slack final replies", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
    )

    expect(prompt).toContain("## Communication")
    expect(prompt).toContain(
      "For `message`, format the response natively for the reply surface."
    )
    expect(prompt).toContain("Surface: `Slack`")
    expect(prompt).toContain("Guidance:")
    expect(
      prompt.indexOf(
        "For `message`, format the response natively for the reply surface."
      )
    ).toBeLessThan(prompt.indexOf("Surface: `Slack`"))
    expect(prompt).toContain("Use Slack `mrkdwn` sparingly")
    expect(prompt).not.toContain("## Slack")
    expect(prompt).not.toContain("### Text")
    expect(prompt).not.toContain("## Format")
    expect(prompt).not.toContain("Output contract:")
    expect(prompt).not.toContain("Do not use app-callback controls")
  })
})
