import { toolSurfaceLabel } from "../../../integrations/catalog"
import {
  type ToolPermission,
  type ToolSurface,
} from "../../../permissions/catalog"
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
} satisfies Record<ToolSurface, readonly string[]>

const bundledSkillNames = new Set(Object.values(providerSkillNames).flat())

export function getProviderSkillNames(
  provider: ToolSurface,
  permissions: readonly ToolPermission[]
) {
  if (!permissions.some((permission) => permission.access === "write")) {
    return []
  }

  return providerSkillNames[provider]
}

export function createRuntimeToolCapability(
  provider: ToolSurface,
  permissions: ToolPermission[]
): RuntimeToolCapability {
  return {
    provider,
    label: toolSurfaceLabel(provider),
    tools: permissions.map((permission) => ({
      access: permission.access,
      description: permission.description,
      label: permission.label,
      tool: permission.tool,
    })),
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
