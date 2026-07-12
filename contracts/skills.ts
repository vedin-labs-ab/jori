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
