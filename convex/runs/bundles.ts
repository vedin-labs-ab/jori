import { type ToolProvider } from "../permissions/catalog"
import { type RuntimeSkill } from "./prompt"

const providerSkillNames = {
  milo: ["scheduling"],
  slack: ["slack"],
  linear: ["linear"],
  github: ["github"],
  gmail: ["gmail"],
  googleCalendar: ["calendar"],
  microsoftEmail: ["microsoft"],
  microsoftCalendar: ["microsoft"],
} satisfies Record<ToolProvider, readonly string[]>

const bundledSkillNames = new Set(Object.values(providerSkillNames).flat())

export function getProviderSkillNames(provider: ToolProvider) {
  return providerSkillNames[provider]
}

export function filterRuntimeSkillsForBundle(
  skills: RuntimeSkill[],
  enabledSkillNames: readonly string[]
) {
  const enabledSkills = new Set(enabledSkillNames)

  return skills.filter(
    (skill) =>
      skill.tenantId !== null ||
      !bundledSkillNames.has(skill.name) ||
      enabledSkills.has(skill.name)
  )
}
