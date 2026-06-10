import { expect, test } from "vitest"
import { type RuntimeSkill } from "./prompt"
import { workspace } from "./sandbox/harness"
import { createSkillSandboxFiles } from "./skills"

test("renders runtime skills as standard Agent Skill files", () => {
  const [file] = createSkillSandboxFiles([
    {
      id: "skill-id",
      tenantId: null,
      name: "github",
      description: "Use GitHub for repository context.",
      body: "# GitHub\n\nInspect focused repository context.",
    } satisfies RuntimeSkill,
  ])

  expect(file).toEqual({
    path: `${workspace}/.agents/skills/github/SKILL.md`,
    content: [
      "---",
      'name: "github"',
      'description: "Use GitHub for repository context."',
      "---",
      "",
      "# GitHub",
      "",
      "Inspect focused repository context.",
      "",
    ].join("\n"),
  })
})
