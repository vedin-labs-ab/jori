import { type SkillId, skills } from "../prompts/generated"
import { type Integration } from "../shared/integrations"

export const runtimeSkillNames = ["slack"] as const satisfies readonly SkillId[]

export type RuntimeSkillName = (typeof runtimeSkillNames)[number]
export type RuntimeSkill = (typeof skills)[RuntimeSkillName]

const runtimeSkillNameSet = new Set<string>(runtimeSkillNames)

export function listRuntimeSkills(): RuntimeSkill[] {
  return runtimeSkillNames.map((name) => skills[name])
}

export function getRuntimeSkill(name: string) {
  const normalized = name.trim().toLowerCase()

  return isRuntimeSkillName(normalized) ? skills[normalized] : null
}

export function getRuntimeSkillForIntegration(integration: Integration) {
  return (
    listRuntimeSkills().find((skill) =>
      skill.associatedIntegrations.some(
        (candidate) => candidate === integration
      )
    ) ?? null
  )
}

export function formatRuntimeSkill(skill: RuntimeSkill) {
  return [`## ${formatSkillTitle(skill.name)}`, skill.body].join("\n\n")
}

function isRuntimeSkillName(name: string): name is RuntimeSkillName {
  return runtimeSkillNameSet.has(name)
}

function formatSkillTitle(name: RuntimeSkillName) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
