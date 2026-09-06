import {
  type Integration,
  integrationLabel,
  integrations,
} from "./integrations/index.ts"

// Where a skill applies: an integration, or the console, which carries
// conversations without an integration behind it.
export const skillSurfaces = ["console", ...integrations] as const

export type SkillSurface = (typeof skillSurfaces)[number]

export function isSkillSurface(value: string): value is SkillSurface {
  return skillSurfaces.some((surface) => surface === value)
}

export function skillSurfaceLabel(surface: SkillSurface) {
  return surface === "console" ? "Console" : integrationLabel(surface)
}

export function skillIntegrations(surfaces: readonly SkillSurface[]) {
  return surfaces.filter(
    (surface): surface is Integration => surface !== "console"
  )
}

export const skillCategories = [
  "communication",
  "creation",
  "operations",
  "research",
] as const

export type SkillCategory = (typeof skillCategories)[number]

const skillCategoryLabels = {
  communication: "Communication",
  creation: "Creation",
  operations: "Operations",
  research: "Research",
} satisfies Record<SkillCategory, string>

export function skillCategoryLabel(category: SkillCategory) {
  return skillCategoryLabels[category]
}

export function isSkillCategory(value: string): value is SkillCategory {
  return value in skillCategoryLabels
}
