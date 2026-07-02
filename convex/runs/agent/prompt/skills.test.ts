import { describe, expect, test } from "vitest"
import { assemblePrompt } from "."
import { runtimeInput } from "./fixtures"
import { runtimeSkill, runtimeSkills } from "./skill_fixtures"

describe("runtime skill prompts", () => {
  test("lists loadable skills without loading unrelated skill bodies", () => {
    const prompt = assemblePrompt(githubInput(), { skills: runtimeSkills() })

    expect(prompt).toContain("# Skills")
    expect(prompt).toContain("Load full instructions with `load_skill`")
    expect(prompt).toContain(
      "`artifact-creator`: Create or update Milo artifacts"
    )
    expect(prompt).toContain("`frontend-design`: Design Milo-native")
    expect(prompt).toContain("`image-generation`: Generate Milo image assets")
    expect(prompt).toContain("`slack`: Format Slack replies")
    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("Use `send_reply`")
    expect(prompt).not.toContain("# Format")
    expect(prompt).not.toContain("Do not use app-callback controls")
  })

  test("eagerly loads Slack guidance for Slack final replies", () => {
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
      { skills: runtimeSkills() }
    )

    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("use the lightest action that delivers it")
    expect(prompt).toContain("words outside a tool call are discarded")
    expect(prompt).toContain("plain closure usually get no response")
    expect(prompt).toContain("Active surface: `Slack`")
    expect(prompt).not.toContain("Current surface:")
    expect(prompt).toContain("# Format")
    expect(prompt).toContain("# Skills")
    expect(prompt).toContain("Load full instructions with `load_skill`")
    expect(prompt).toContain("`image-generation`: Generate Milo image assets")
    expect(prompt).not.toContain("`slack`: Format Slack replies")
    expect(prompt.indexOf("# Communication")).toBeLessThan(
      prompt.indexOf("# Format")
    )
    expect(prompt).toContain("Format Slack messages with Slack `mrkdwn`")
    expect(prompt).toContain(
      "Most replies are a line or two of plain `mrkdwn`. Reach for structure only when it earns its place."
    )
    expect(prompt).toContain(
      "Escape literal `&`, `<`, and `>` unless they are part of valid Slack syntax.\n\nUse Slack `blocks` when structure makes the message easier to scan."
    )
    expect(prompt).toContain(
      "Use Slack `blocks` when structure makes the message easier to scan"
    )
    expect(prompt).toContain("Never use interactive Slack surfaces or controls")
    expect(prompt).not.toContain("## Slack")
    expect(prompt).not.toContain("### Text")
    expect(prompt).not.toContain("Output contract:")
  })
})

describe("tenant runtime skill prompts", () => {
  test("uses tenant skills from the runtime list", () => {
    const prompt = assemblePrompt(githubInput(), {
      skills: runtimeSkills([
        runtimeSkill({
          tenantId: "tenant",
          name: "tenant-playbook",
          description: "Follow the tenant operating playbook.",
          body: "# Tenant Playbook\n\nPrefer tenant-specific guidance.",
        }),
      ]),
    })

    expect(prompt).toContain(
      "`tenant-playbook`: Follow the tenant operating playbook."
    )
  })
})

function githubInput() {
  return runtimeInput("github", {
    repository: { fullName: "acme/app" },
    issueNumber: 12,
    comment: { id: "comment-id", kind: "issue_comment" },
  })
}
