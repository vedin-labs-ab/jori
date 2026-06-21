import { getRuntimeSkill, listRuntimeSkills } from "./runtime"

type MiloSkillToolRequest = {
  args?: unknown
  tool: string
}

export function isMiloSkillTool(tool: string) {
  return tool === "load_skill"
}

export function callMiloSkillTool(request: MiloSkillToolRequest) {
  if (!isMiloSkillTool(request.tool)) {
    throw new Error(`Unknown Milo skill tool: ${request.tool}`)
  }

  const name = readSkillName(request.args)
  const skill = name === null ? null : getRuntimeSkill(name)

  if (skill === null) {
    return {
      status: "not_found" as const,
      name,
      availableSkills: skillMetadata(),
    }
  }

  return {
    status: "loaded" as const,
    skill: {
      name: skill.name,
      category: skill.category,
      description: skill.description,
      associatedIntegrations: skill.associatedIntegrations,
      instructions: skill.body,
    },
  }
}

function skillMetadata() {
  return listRuntimeSkills().map((skill) => ({
    name: skill.name,
    category: skill.category,
    description: skill.description,
    associatedIntegrations: skill.associatedIntegrations,
  }))
}

function readSkillName(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return null
  }

  const value = (args as Record<string, unknown>).name

  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}
