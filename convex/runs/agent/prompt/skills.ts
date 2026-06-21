import { createCommunicationGuidance } from "../../../skills/communication"
import { listRuntimeSkills } from "../../../skills/runtime"
import { type AgentRuntimeInput } from "../input"

export function createSkillInstructions(input: AgentRuntimeInput) {
  const communication = createMessageCommunicationGuidance(input)

  return [
    createSkillDiscoveryInstructions(),
    ...(communication === null ? [] : ["", communication]),
  ].join("\n")
}

function createMessageCommunicationGuidance(input: AgentRuntimeInput) {
  if (input.type !== "message") {
    return null
  }

  return createCommunicationGuidance({
    integration: input.messageIntegration,
    profile: "agent-final-reply",
  })
}

function createSkillDiscoveryInstructions() {
  return [
    "# Skills",
    "Use `load_skill` to load full instructions for an available skill when needed.",
    "Before drafting or sending content to a communication surface, load that surface's skill when available unless it is already loaded below.",
    "",
    "Available skills:",
    formatAvailableSkills(),
  ].join("\n")
}

function formatAvailableSkills() {
  return listRuntimeSkills()
    .map((skill) => `- \`${skill.name}\`: ${skill.description}`)
    .join("\n")
}
