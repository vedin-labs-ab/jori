import { type RuntimePrompt } from "../../../../contracts/runtime"
import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { type ToolPermission } from "../../../permissions/catalog"
import { type RuntimeSkill } from "../../../skills/runtime"
import { type AgentRuntimeInput } from "../input"
import { createApprovalInstructions } from "./approvals"
import { createCommunicationInstructions } from "./communication"
import {
  createContextValues,
  defaultActiveSurface,
  type PromptActiveSurface,
} from "./context"
import { createOrganizationMessage } from "./organization"
import { createSkillInstructions } from "./skills"

export function assemblePrompt(
  input: AgentRuntimeInput,
  options: {
    activeSurface?: PromptActiveSurface | null
    person?: string | null
    promptedTools?: ToolPermission[]
    skills?: readonly RuntimeSkill[]
  } = {}
): RuntimePrompt {
  const runtimeSkills = options.skills ?? []
  const activeSurface = options.activeSurface ?? defaultActiveSurface(input)
  const communication = createCommunicationInstructions(input, runtimeSkills, {
    activeSurface: activeSurface !== null,
  })
  const promptedTools = options.promptedTools ?? []
  const skills = createSkillInstructions({
    omittedNames: omittedSkillNames(communication),
    skills: runtimeSkills,
  })
  const context = createContextValues(input, activeSurface)
  const offerIntegration = input.type !== "automation"

  const instructions = renderPromptTemplate(
    promptTemplates["agent/instructions"],
    {
      agent: {
        approvals: optionalPromptBlock(
          createApprovalInstructions(promptedTools)
        ),
        communication: optionalPromptBlock(communication?.communication ?? ""),
        format: optionalPromptBlock(communication?.format ?? ""),
        skills: optionalPromptBlock(skills),
      },
      tools: {
        add_reaction: activeSurface !== null,
        offer_integration: offerIntegration,
        send_reply: activeSurface !== null,
      },
    }
  )

  return {
    context: renderPromptTemplate(promptTemplates["agent/context"], {
      agent: context,
    }),
    instructions,
    organization: optionalPromptBlock(createOrganizationMessage(input)),
    person: options.person ?? null,
  }
}

function omittedSkillNames(
  communication: ReturnType<typeof createCommunicationInstructions>
) {
  if (communication === null || communication.skill === null) {
    return new Set<string>()
  }

  return new Set([communication.skill.name])
}

function optionalPromptBlock(value: string) {
  const block = value.trim()

  return block === "" ? null : block
}
