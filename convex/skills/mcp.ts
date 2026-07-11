import { internal } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
import { type MiloToolRequest } from "../shared/input"
import {
  getRuntimeSkill,
  listRuntimeSkills,
  type RuntimeSkill,
  runtimeSkillAssociatedIntegrations,
} from "./runtime"

type MiloSkillRun = {
  tenantId: string
}

export function isMiloSkillTool(tool: string) {
  return tool === "load_skill"
}

export async function callMiloSkillTool(
  ctx: ActionCtx,
  run: MiloSkillRun,
  request: MiloToolRequest
) {
  const skills = (await ctx.runQuery(internal.skills.catalog.listForRuntime, {
    tenantId: run.tenantId,
  })) as RuntimeSkill[]

  return loadMiloSkillTool(skills, request)
}

export function loadMiloSkillTool(
  skills: readonly RuntimeSkill[],
  request: MiloToolRequest
) {
  if (!isMiloSkillTool(request.tool)) {
    throw new Error(`Unknown Milo skill tool: ${request.tool}`)
  }

  const name = readSkillName(request.args)
  const skill = name === null ? null : getRuntimeSkill(skills, name)

  if (skill === null) {
    return {
      status: "not_found" as const,
      name,
      availableSkills: skillMetadata(skills),
    }
  }

  return {
    status: "loaded" as const,
    skill: {
      name: skill.name,
      category: skill.category,
      description: skill.description,
      associatedIntegrations: runtimeSkillAssociatedIntegrations(skill),
      instructions: skill.body,
    },
  }
}

function skillMetadata(skills: readonly RuntimeSkill[]) {
  return listRuntimeSkills(skills).map((skill) => ({
    name: skill.name,
    category: skill.category,
    description: skill.description,
    associatedIntegrations: runtimeSkillAssociatedIntegrations(skill),
  }))
}

function readSkillName(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return null
  }

  const value = (args as Record<string, unknown>).name

  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}
