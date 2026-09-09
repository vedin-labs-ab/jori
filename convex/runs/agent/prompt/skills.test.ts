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

  test("embeds active-surface guidance and lists other skills to load", () => {
    const slack = runtimeSkill({
      name: "slack",
      category: "communication",
      surfaces: ["slack"],
      description: "Format Slack replies.",
      body: "This body should not replace communication guidance.",
      communication: {
        parts: { text: "Text guidance.", rich: "Rich guidance." },
      },
    })
    const prompt = assemblePrompt(
      runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
      { skills: [slack, runtimeSkills()[0]] }
    ).instructions

    expect(prompt).toContain("# Communication")
    expect(prompt).toContain("# Format\n\nText guidance.\n\nRich guidance.")
    expect(prompt).not.toContain(slack.body)
    expect(prompt).not.toContain("`slack`: Format Slack replies")
    expect(prompt).toContain("`image-generation`: Generate Jori image files")
    expect(prompt.indexOf("# Communication")).toBeLessThan(
      prompt.indexOf("Text guidance.")
    )
  })
})

describe("organization runtime skill prompts", () => {
  test("uses organization skills from the runtime list", () => {
    const prompt = assemblePrompt(githubInput(), {
      skills: runtimeSkills([
        runtimeSkill({
          organizationId: "organization",
          name: "organization-handbook",
          description: "Follow the organization operating handbook.",
          body: "# Organization Handbook\n\nPrefer organization-specific guidance.",
        }),
      ]),
    }).instructions

    expect(prompt).toContain(
      "`organization-handbook`: Follow the organization operating handbook."
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
