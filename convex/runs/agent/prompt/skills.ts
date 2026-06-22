import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import {
  type CommunicationGuidance,
  createCommunicationGuidance,
} from "../../../skills/communication"
import { listRuntimeSkills } from "../../../skills/runtime"
import { type AgentRuntimeInput } from "../input"

export function createSkillInstructions(input: AgentRuntimeInput) {
  const communication = createMessageCommunicationGuidance(input)

  return renderPromptTemplate(promptTemplates["skills/discovery"], {
    skills: {
      available: formatAvailableSkills(omittedSkillNames(communication)),
      communication: communication?.body ?? "",
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

function omittedSkillNames(communication: CommunicationGuidance | null) {
  return new Set(communication === null ? [] : [communication.skill.name])
}

function formatAvailableSkills(omittedNames: ReadonlySet<string>) {
  const available = listRuntimeSkills().filter(
    (skill) => !omittedNames.has(skill.name)
  )

  if (available.length === 0) {
    return "- None"
  }

  return available
    .map((skill) => `- \`${skill.name}\`: ${skill.description}`)
    .join("\n")
}
