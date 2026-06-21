import {
  getRuntimeSkillForIntegration,
  listRuntimeSkills,
  type RuntimeSkill,
} from "../../../skills/runtime"
import { type AgentRuntimeInput } from "../input"

export function createSkillInstructions(input: AgentRuntimeInput) {
  const loadedSkills = getLoadedSkills(input)

  return [
    "# Skills",
    "Load specialized guidance only when it affects work you are about to do.",
    "Use `load_skill` to load full instructions for an available skill when needed.",
    "Before drafting or sending content to a communication surface, load that surface's skill when available unless it is already loaded below.",
    "Routine final replies are delivered as text; use rich payloads such as Slack blocks only when calling a write tool that accepts them.",
    "",
    "Available skills:",
    formatAvailableSkills(),
    ...formatLoadedSkills(loadedSkills),
  ].join("\n")
}

function getLoadedSkills(input: AgentRuntimeInput) {
  const skill =
    input.type === "message"
      ? getRuntimeSkillForIntegration(input.messageIntegration)
      : getAutomationTriggerSkill(input)

  return skill === null ? [] : [skill]
}

function getAutomationTriggerSkill(input: AgentRuntimeInput) {
  if (input.type !== "automation" || input.integration === null) {
    return null
  }

  return getRuntimeSkillForIntegration(input.integration.integration)
}

function formatAvailableSkills() {
  return listRuntimeSkills()
    .map((skill) => `- \`${skill.name}\`: ${skill.description}`)
    .join("\n")
}

function formatLoadedSkills(skills: RuntimeSkill[]) {
  if (skills.length === 0) {
    return []
  }

  return ["", "Loaded skills:", "", ...skills.map(formatLoadedSkill)]
}

function formatLoadedSkill(skill: RuntimeSkill) {
  return [`## ${skill.name}`, skill.body].join("\n\n")
}
