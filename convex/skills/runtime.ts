import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import { type Integration } from "../shared/integrations"
import { sortSkills } from "./data"

export type RuntimeSkill = {
  associatedIntegrations: readonly Integration[]
  body: string
  category: string
  communication?: {
    parts: Readonly<Record<string, string>>
  }
  description: string
  name: string
  tenantId: string | null
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

export function getRuntimeSkillForIntegration(
  skills: readonly RuntimeSkill[],
  integration: Integration
) {
  const candidates = sortSkills([...skills]).filter((skill) =>
    runtimeSkillAssociatedIntegrations(skill).some(
      (candidate) => candidate === integration
    )
  )

  return (
    candidates.find(isTenantCommunicationSkill) ??
    candidates.find(isCommunicationSkill) ??
    candidates.find((skill) => skill.tenantId !== null) ??
    candidates[0] ??
    null
  )
}

export function runtimeSkillAssociatedIntegrations(skill: RuntimeSkill) {
  return skill.associatedIntegrations
}

export function formatRuntimeSkill(skill: RuntimeSkill) {
  return renderPromptTemplate(promptTemplates["skills/loaded"], {
    skill: {
      body: skill.body,
      title: formatRuntimeSkillTitle(skill),
    },
  })
}

export function formatRuntimeSkillTitle(skill: RuntimeSkill) {
  return formatSkillTitle(skill.name)
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
  return existing.tenantId === null && candidate.tenantId !== null
}

function isTenantCommunicationSkill(skill: RuntimeSkill) {
  return skill.tenantId !== null && isCommunicationSkill(skill)
}

function isCommunicationSkill(skill: RuntimeSkill) {
  return skill.communication !== undefined
}

function formatSkillTitle(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
