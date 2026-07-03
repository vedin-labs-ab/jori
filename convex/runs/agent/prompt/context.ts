import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { createPromptTime } from "../../../../prompts/time"
import { integrationLabels } from "../../../automations/integrations"
import { replyAddress } from "../../../messages/surface"
import { type AgentRuntimeInput, type MessageIntegration } from "../input"
import { createMessageConversationValues } from "./conversation"
import { createMessageTargetValues, formatEvent } from "./target"

export type PromptActiveSurface = {
  surface: MessageIntegration
}

export function createContextValues(
  input: AgentRuntimeInput,
  activeSurface: PromptActiveSurface | null
): {
  organization: string | null
  run: string
  trigger: string
} {
  return {
    organization: optionalPromptBlock(createOrganizationInstructions(input)),
    run: createRunInstructions(input.run._id, activeSurface),
    trigger: promptBlock(createTriggerPart(input)),
  }
}

export function defaultActiveSurface(
  input: AgentRuntimeInput
): PromptActiveSurface | null {
  return input.type === "message" && replyAddress(input.message) !== null
    ? { surface: input.messageIntegration }
    : null
}

// The section renders when anything is known: approved facts, deduced
// workstreams, or both. A tenant that skipped onboarding still gets its
// roster.
function createOrganizationInstructions(input: AgentRuntimeInput) {
  const facts = input.organization
  const workstreams = input.workstreams ?? []

  if (!facts?.name && workstreams.length === 0) {
    return ""
  }

  const aliases = facts?.aliases ?? []
  const domains = facts?.domains ?? []

  return renderPromptTemplate(promptTemplates["organization/message"], {
    organization: {
      name: facts?.name ?? null,
      summary: facts?.summary ?? null,
      aliases: aliases.length === 0 ? null : aliases.join(", "),
      domains: domains.length === 0 ? null : domains,
      workstreams: workstreams.length === 0 ? null : workstreams,
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

function createTriggerPart(input: AgentRuntimeInput) {
  if (input.type === "automation") {
    return renderPromptTemplate(
      promptTemplates["trigger/automation"],
      createAutomationValues(input)
    )
  }

  if (input.type === "instruction") {
    return renderPromptTemplate(
      promptTemplates["trigger/instruction"],
      createInstructionValues(input)
    )
  }

  return renderPromptTemplate(
    promptTemplates["trigger/message"],
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

function promptBlock(value: string) {
  return value.trim()
}

function optionalPromptBlock(value: string) {
  const block = promptBlock(value)

  return block === "" ? null : block
}
