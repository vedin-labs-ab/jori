import { internal } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
import { type JoriToolRequest } from "../shared/input"
import {
  getRuntimeSkill,
  listRuntimeSkills,
  type RuntimeSkill,
} from "./runtime"

type JoriSkillRun = {
  organizationId: string
}

export function isJoriSkillTool(tool: string) {
  return tool === "load_skill"
}

export async function callJoriSkillTool(
  ctx: ActionCtx,
  run: JoriSkillRun,
  request: JoriToolRequest
) {
  const skills = (await ctx.runQuery(internal.skills.catalog.listForRuntime, {
    organizationId: run.organizationId,
  })) as RuntimeSkill[]

  return loadJoriSkillTool(skills, request)
}

export function loadJoriSkillTool(
  skills: readonly RuntimeSkill[],
  request: JoriToolRequest
) {
  if (!isJoriSkillTool(request.tool)) {
    throw new Error(`Unknown Jori skill tool: ${request.tool}`)
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
      surfaces: skill.surfaces,
      instructions: skill.body,
    },
  }
}

function skillMetadata(skills: readonly RuntimeSkill[]) {
  return listRuntimeSkills(skills).map((skill) => ({
    name: skill.name,
    category: skill.category,
    description: skill.description,
    surfaces: skill.surfaces,
  }))
}

function readSkillName(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return null
  }

  const value = (args as Record<string, unknown>).name

  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}
