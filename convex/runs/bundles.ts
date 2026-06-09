import { type ToolPermission, type ToolProvider } from "../permissions/catalog"
import { type RuntimeSkill } from "./prompt"
import { type RuntimeToolCapability } from "./tools/types"

const providerMetadata = {
  milo: {
    label: "Schedules",
    skillNames: ["scheduling"],
  },
  slack: {
    label: "Slack",
    skillNames: ["slack"],
  },
  linear: {
    label: "Linear",
    skillNames: ["linear"],
  },
  github: {
    label: "GitHub",
    skillNames: ["github"],
  },
  gmail: {
    label: "Gmail",
    skillNames: ["gmail"],
  },
  googleCalendar: {
    label: "Google Calendar",
    skillNames: ["calendar"],
  },
  notion: {
    label: "Notion",
    skillNames: ["notion"],
  },
  microsoftEmail: {
    label: "Outlook Mail",
    skillNames: ["microsoft"],
  },
  microsoftCalendar: {
    label: "Microsoft Calendar",
    skillNames: ["microsoft"],
  },
} satisfies Record<
  ToolProvider,
  {
    label: string
    skillNames: readonly string[]
  }
>

const bundledSkillNames = new Set(
  Object.values(providerMetadata).flatMap((metadata) => metadata.skillNames)
)

export function getProviderSkillNames(provider: ToolProvider) {
  return providerMetadata[provider].skillNames
}

export function createRuntimeToolCapability(
  provider: ToolProvider,
  permissions: ToolPermission[]
): RuntimeToolCapability {
  return {
    provider,
    label: providerMetadata[provider].label,
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
