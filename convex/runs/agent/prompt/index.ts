import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { createPromptTime } from "../../../../prompts/time"
import { integrationLabels } from "../../../automations/integrations"
import { replyAddress } from "../../../messages/surface"
import { type ToolPermission } from "../../../permissions/catalog"
import { type RuntimeSkill } from "../../../skills/runtime"
import { type AgentRuntimeInput, type MessageIntegration } from "../input"
import { createCommunicationInstructions } from "./communication"
import { createMessageConversationValues } from "./conversation"
import { createToolApprovalInstructions } from "./instructions"
import { createSkillInstructions } from "./skills"
import { createMessageTargetValues, formatEvent } from "./target"

export function assemblePrompt(
  input: AgentRuntimeInput,
  options: {
    activeSurface?: PromptActiveSurface | null
    promptedTools?: ToolPermission[]
    skills?: readonly RuntimeSkill[]
  } = {}
): string {
  const runtimeSkills = options.skills ?? []
  const activeSurface = options.activeSurface ?? defaultActiveSurface(input)
  const communication = createCommunicationInstructions(input, runtimeSkills, {
    activeSurface: activeSurface !== null,
  })
  const run = createRunInstructions(input.run._id, activeSurface)
  const promptedTools = options.promptedTools ?? []
  const skills = createSkillInstructions({
    omittedNames: omittedSkillNames(communication),
    skills: runtimeSkills,
  })
  const offerIntegration = input.type !== "automation"

  return renderPromptTemplate(promptTemplates["agent/initial"], {
    agent: {
      approvals: optionalPromptBlock(createApprovalInstructions(promptedTools)),
      communication: optionalPromptBlock(communication?.communication ?? ""),
      format: optionalPromptBlock(communication?.format ?? ""),
      organization: optionalPromptBlock(createOrganizationInstructions(input)),
      run,
      skills: optionalPromptBlock(skills),
      trigger: promptBlock(createTriggerPart(input, true)),
    },
    run: {
      type: input.type,
    },
    surface: {
      active: activeSurface !== null,
      integration: activeSurface?.surface ?? null,
    },
    tools: {
      add_reaction: activeSurface !== null,
      finish_run: true,
      offer_integration: offerIntegration,
      send_reply: activeSurface !== null,
    },
  })
}

type PromptActiveSurface = {
  surface: MessageIntegration
}

function defaultActiveSurface(
  input: AgentRuntimeInput
): PromptActiveSurface | null {
  return input.type === "message" && replyAddress(input.message) !== null
    ? { surface: input.messageIntegration }
    : null
}

function omittedSkillNames(
  communication: ReturnType<typeof createCommunicationInstructions>
) {
  if (communication === null || communication.skill === null) {
    return new Set<string>()
  }

  return new Set([communication.skill.name])
}

function createApprovalInstructions(promptedTools: ToolPermission[]) {
  return promptedTools.length === 0
    ? ""
    : promptBlock(createToolApprovalInstructions(promptedTools))
}

function createOrganizationInstructions(input: AgentRuntimeInput) {
  const facts = input.organization

  if (!facts?.name) {
    return ""
  }

  return renderPromptTemplate(promptTemplates["organization/message"], {
    organization: {
      name: facts.name,
      summary: facts.summary ?? null,
      aliases: facts.aliases.length === 0 ? null : facts.aliases.join(", "),
      domains: facts.domains.length === 0 ? null : facts.domains,
    },
  }).trim()
}

function createRunInstructions(
  runId: AgentRuntimeInput["run"]["_id"],
  activeSurface: PromptActiveSurface | null
) {
  return renderPromptTemplate(promptTemplates["run/message"], {
    run: {
      id: runId,
    },
    surface: {
      active: activeSurface !== null,
      label:
        activeSurface === null
          ? null
          : getIntegrationLabel(activeSurface.surface),
    },
    time: { utc: createPromptTime() },
  }).trim()
}

function promptBlock(value: string) {
  return value.trim()
}

function optionalPromptBlock(value: string) {
  const block = promptBlock(value)

  return block === "" ? null : block
}

function createTriggerPart(input: AgentRuntimeInput, isInitialRun: boolean) {
  if (input.type === "automation") {
    return renderPromptTemplate(
      isInitialRun
        ? promptTemplates["trigger/automation"]
        : promptTemplates["reference/automation"],
      createAutomationValues(input)
    )
  }

  if (input.type === "instruction") {
    return renderPromptTemplate(
      isInitialRun
        ? promptTemplates["trigger/instruction"]
        : promptTemplates["reference/instruction"],
      createInstructionValues(input)
    )
  }

  return renderPromptTemplate(
    isInitialRun
      ? promptTemplates["trigger/message"]
      : promptTemplates["reference/message"],
    createMessageValues(input)
  )
}

function createInstructionValues(
  input: Extract<AgentRuntimeInput, { type: "instruction" }>
) {
  return {
    instruction: {
      text: input.instructions,
    },
  }
}

function createMessageValues(
  input: Extract<AgentRuntimeInput, { type: "message" }>
) {
  const target = createMessageTargetValues(
    input.messageIntegration,
    input.message.data
  )
  const conversation = createMessageConversationValues(input)

  return {
    message: {
      conversation: conversation.body,
      conversationSummary: conversation.summary,
      current: conversation.current,
      github: target.github,
      integration: getIntegrationLabel(input.messageIntegration),
      linear: target.linear,
      slack: target.slack,
      surface: input.messageIntegration,
    },
  }
}

function createAutomationValues(
  input: Extract<AgentRuntimeInput, { type: "automation" }>
) {
  return {
    automation: {
      id: input.automation._id,
      name: input.automation.name,
      instructions: input.automation.instructions,
      trigger: formatAutomationTrigger(input),
    },
    event:
      input.event === null
        ? null
        : {
            details: formatEvent(input.event, input.integration?.integration),
          },
  }
}

function formatAutomationTrigger(
  input: Extract<AgentRuntimeInput, { type: "automation" }>
) {
  const cause = input.run.cause

  if (cause.type === "time") {
    return `Time at ${new Date(cause.scheduledAt).toISOString()}`
  }

  if (cause.type === "event") {
    return "Integration event"
  }

  if (cause.type === "manual") {
    return "Manual"
  }

  return "Unknown"
}

function getIntegrationLabel(integration: MessageIntegration) {
  return integrationLabels[integration]
}
