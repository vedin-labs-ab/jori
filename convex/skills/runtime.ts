import { type SkillCategory, type SkillSurface } from "../../contracts/skills"
import { sortSkills } from "./data"

export type RuntimeSkill = {
  surfaces: readonly SkillSurface[]
  body: string
  category: SkillCategory
  communication?: {
    parts: Readonly<Record<string, string>>
  }
  description: string
  name: string
  organizationId: string | null
}

export function listRuntimeSkills(skills: readonly RuntimeSkill[]) {
  return sortSkills(resolveRuntimeSkillNames(skills))
}

export function runtimeSkillNames(skills: readonly RuntimeSkill[]) {
  return listRuntimeSkills(skills).map((skill) => skill.name)
}

export function getRuntimeSkill(skills: readonly RuntimeSkill[], name: string) {
  const normalized = name.trim().toLowerCase()

  return (
    listRuntimeSkills(skills).find((skill) => skill.name === normalized) ?? null
  )
}

export function getRuntimeSkillForSurface(
  skills: readonly RuntimeSkill[],
  surface: SkillSurface
) {
  const candidates = sortSkills([...skills]).filter((skill) =>
    skill.surfaces.some((candidate) => candidate === surface)
  )

  return (
    candidates.find(isOrganizationCommunicationSkill) ??
    candidates.find(isCommunicationSkill) ??
    candidates.find((skill) => skill.organizationId !== null) ??
    candidates[0] ??
    null
  )
}

function resolveRuntimeSkillNames(skills: readonly RuntimeSkill[]) {
  const result = new Map<string, RuntimeSkill>()

  for (const skill of skills) {
    const existing = result.get(skill.name)

    if (existing === undefined || shouldReplaceRuntimeSkill(existing, skill)) {
      result.set(skill.name, skill)
    }
  }

  return [...result.values()]
}

function shouldReplaceRuntimeSkill(
  existing: RuntimeSkill,
  candidate: RuntimeSkill
) {
  return existing.organizationId === null && candidate.organizationId !== null
}

function isOrganizationCommunicationSkill(skill: RuntimeSkill) {
  return skill.organizationId !== null && isCommunicationSkill(skill)
}

function isCommunicationSkill(skill: RuntimeSkill) {
  return skill.communication !== undefined
}
