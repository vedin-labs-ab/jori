import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { createCommunicationGuidance } from "../../../skills/communication"
import { listRuntimeSkills } from "../../../skills/runtime"
import { type AgentRuntimeInput } from "../input"

export function createSkillInstructions(input: AgentRuntimeInput) {
  return renderPromptTemplate(promptTemplates["skills/discovery"], {
    skills: {
      available: formatAvailableSkills(),
      communication: createMessageCommunicationGuidance(input) ?? "",
    },
  })
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

function formatAvailableSkills() {
  return listRuntimeSkills()
    .map((skill) => `- \`${skill.name}\`: ${skill.description}`)
    .join("\n")
}
