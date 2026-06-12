import {
  type ToolPermission,
  type ToolProvider,
} from "../../permissions/catalog"
import { providerLabel } from "../../providers/catalog"
import { type RuntimeSkill } from "../sandbox/skills"
import { type RuntimeToolCapability } from "./types"

const providerSkillNames = {
  milo: [],
  slack: ["slack"],
  linear: [],
  github: [],
  gmail: [],
  googleCalendar: [],
  googleDrive: [],
  notion: [],
  microsoftEmail: [],
  microsoftCalendar: [],
} satisfies Record<ToolProvider, readonly string[]>

const bundledSkillNames = new Set(Object.values(providerSkillNames).flat())

export function getProviderSkillNames(
  provider: ToolProvider,
  permissions: readonly ToolPermission[]
) {
  if (!permissions.some((permission) => permission.access === "write")) {
    return []
  }

  return providerSkillNames[provider]
}

export function createRuntimeToolCapability(
  provider: ToolProvider,
  permissions: ToolPermission[]
): RuntimeToolCapability {
  return {
    provider,
    label: providerLabel(provider),
    tools: permissions.map((permission) => permission.label),
  }
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
