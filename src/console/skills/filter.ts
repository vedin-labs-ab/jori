import { skillSurfaceLabel } from "@contracts/skills"
import { type Skill, type SkillFilterView } from "./types"

export function filterSkills(skills: Skill[], searchTerm: string) {
  const query = searchTerm.trim().toLowerCase()

  if (query.length === 0) {
    return skills
  }

  return skills.filter((skill) => skillSearchText(skill).includes(query))
}

export function filterSkillsByView(skills: Skill[], view: SkillFilterView) {
  if (view === "all") {
    return skills
  }

  return skills.filter((skill) => skill.scope === view)
}

function skillSearchText(skill: Skill) {
  return [
    skill.name,
    skill.category,
    skill.description,
    skill.body,
    ...skill.surfaces.map(skillSurfaceLabel),
  ]
    .join(" ")
    .toLowerCase()
}
