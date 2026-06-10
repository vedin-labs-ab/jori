import { type RuntimeSkill } from "./prompt"
import { workspace } from "./sandbox/harness"
import { type SandboxFile } from "./tools"

export function createSkillSandboxFiles(skills: RuntimeSkill[]): SandboxFile[] {
  return skills.map((skill) => ({
    path: `${workspace}/.agents/skills/${skill.name}/SKILL.md`,
    content: renderSkillFile(skill),
  }))
}

function renderSkillFile(skill: RuntimeSkill) {
  return [
    "---",
    `name: ${quoteYamlString(skill.name)}`,
    `description: ${quoteYamlString(skill.description)}`,
    "---",
    "",
    skill.body.trim(),
    "",
  ].join("\n")
}

function quoteYamlString(value: string) {
  return JSON.stringify(value)
}
