import { type Skill } from "./types"

export const emptyGroupedSkills = {
  global: [],
  tenant: [],
} satisfies Record<Skill["scope"], Skill[]>

export function groupSkills(skills: Skill[]) {
  return skills.reduce<Record<Skill["scope"], Skill[]>>(
    (groups, skill) => {
      groups[skill.scope].push(skill)
      return groups
    },
    { global: [], tenant: [] }
  )
}

export function filterSkills(skills: Skill[], searchTerm: string) {
  const query = searchTerm.trim().toLowerCase()

  if (query.length === 0) {
    return skills
  }

  return skills.filter((skill) => skillSearchText(skill).includes(query))
}

function skillSearchText(skill: Skill) {
  return [skill.name, skill.description, skill.body].join(" ").toLowerCase()
}
