import { toolSurfaceLabel } from "../../../integrations/catalog"
import {
  type PermissionMode,
  resolveToolMode,
  type ToolPermission,
  type ToolSurface,
} from "../../../permissions/catalog"
import { type RuntimeSkill } from "../sandbox/skills"
import { type RuntimeToolCapability } from "./types"

const surfaceSkillNames = {
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

const bundledSkillNames = new Set(Object.values(surfaceSkillNames).flat())

export function getSurfaceSkillNames(
  surface: ToolSurface,
  permissions: readonly ToolPermission[]
) {
  if (!permissions.some((permission) => permission.access === "write")) {
    return []
  }

  return surfaceSkillNames[surface]
}

export function createRuntimeToolCapability(
  surface: ToolSurface,
  permissions: ToolPermission[],
  toolModes: ReadonlyMap<string, PermissionMode>
): RuntimeToolCapability {
  return {
    surface,
    label: toolSurfaceLabel(surface),
    tools: permissions.map((permission) => ({
      access: permission.access,
      description: permission.description,
      label: permission.label,
      ...(resolveToolMode(toolModes, permission.tool) === "prompted"
        ? { requiresApproval: true }
        : {}),
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
