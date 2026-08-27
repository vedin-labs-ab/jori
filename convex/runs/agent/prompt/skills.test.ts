import { describe, expect, test } from "vitest"
import { runtimeInput } from "../../../../test/convex/prompt"
import { runtimeSkill, runtimeSkills } from "../../../../test/convex/skills"
import { assemblePrompt } from "."

describe("runtime skill prompts", () => {
  test("lists loadable skills without loading unrelated skill bodies", () => {
    const prompt = assemblePrompt(githubInput(), {
      skills: runtimeSkills(),
    }).instructions

    expect(prompt).toContain("# Skills")
    expect(prompt).toContain("Load full instructions with `load_skill`")
    expect(prompt).toContain("`image-generation`: Generate Jori image files")
    expect(prompt).toContain("`slack`: Format Slack replies")
    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("Use `send_reply`")
    expect(prompt).not.toContain("# Format")
  })

  test("eagerly loads Slack guidance for Slack final replies", () => {
    const runtimePrompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
      { skills: runtimeSkills() }
    )
    const prompt = runtimePrompt.instructions

    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("use the lightest action that delivers it")
    expect(prompt).toContain("words outside a tool call are discarded")
    expect(prompt).toContain("plain closure usually get no response")
    expect(runtimePrompt.context).toContain("Active surface: `Slack`")
    expect(prompt).not.toContain("Current surface:")
    expect(prompt).toContain("# Format")
    expect(prompt).toContain("# Skills")
    expect(prompt).toContain("Load full instructions with `load_skill`")
    expect(prompt).toContain("`image-generation`: Generate Jori image files")
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

describe("organization runtime skill prompts", () => {
  test("uses organization skills from the runtime list", () => {
    const prompt = assemblePrompt(githubInput(), {
      skills: runtimeSkills([
        runtimeSkill({
          organizationId: "organization",
          name: "organization-playbook",
          description: "Follow the organization operating playbook.",
          body: "# Organization Playbook\n\nPrefer organization-specific guidance.",
        }),
      ]),
    }).instructions

    expect(prompt).toContain(
      "`organization-playbook`: Follow the organization operating playbook."
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
