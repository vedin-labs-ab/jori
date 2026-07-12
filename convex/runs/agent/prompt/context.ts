import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import {
  createLocalPromptTime,
  createPromptTime,
} from "../../../../prompts/time"
import { integrationLabels } from "../../../integrations/resolve"
import { replyAddress } from "../../../messages/surface"
import { type MessageIntegration } from "../../../shared/integrations"
import { type AgentRuntimeInput } from "../input"
import { createMessageConversationValues } from "./conversation"
import { createMessageTargetValues, formatEvent } from "./target"

export type PromptActiveSurface = {
  surface: MessageIntegration
}

export function createRequesterMessage(input: AgentRuntimeInput) {
  const requester = input.requester

  if (requester === null || requester === undefined) {
    return ""
  }

  return renderPromptTemplate(promptTemplates["agent/requester"], {
    requester: {
      name: requester.name ?? null,
      emails: requester.emails.length === 0 ? null : requester.emails,
      timezone: requester.timezone ?? null,
      accounts:
        requester.accounts.length === 0
          ? null
          : requester.accounts.map((account) => ({
              integration: integrationLabels[account.integration],
              name: account.name ?? null,
              email: account.email ?? null,
            })),
    },
  }).trim()
}

export function createContext(
  input: AgentRuntimeInput,
  activeSurface: PromptActiveSurface | null
) {
  return [
    createRunInstructions(input, activeSurface),
    createTriggerPart(input),
  ].join("\n\n")
}

export function defaultActiveSurface(
  input: AgentRuntimeInput
): PromptActiveSurface | null {
  return input.type === "message" && replyAddress(input.message) !== null
    ? { surface: input.messageIntegration }
    : null
}

function createRunInstructions(
  input: AgentRuntimeInput,
  activeSurface: PromptActiveSurface | null
) {
  return renderPromptTemplate(promptTemplates["agent/context/run"], {
    run: {
      id: input.run._id,
      artifactId: input.run.artifactId ?? null,
    },
    surface: {
      active: activeSurface !== null,
      label:
        activeSurface === null
          ? null
          : getIntegrationLabel(activeSurface.surface),
    },
    time: {
      utc: createPromptTime(),
      local:
        typeof input.timezone === "string"
          ? createLocalPromptTime(input.timezone)
          : null,
    },
  }).trim()
}

function createTriggerPart(input: AgentRuntimeInput) {
  if (input.type === "automation") {
    return appendInstructions(
      renderPromptTemplate(
        promptTemplates["agent/context/trigger/automation"],
        createAutomationValues(input)
      ),
      input.instructions
    )
  }

  if (input.type === "instruction") {
    return appendInstructions(
      renderPromptTemplate(
        promptTemplates["agent/context/trigger/instruction"],
        {}
      ),
      input.instructions
    )
  }

  return renderPromptTemplate(
    promptTemplates["agent/context/trigger/message"],
    createMessageValues(input)
  )
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
      id: input.run.automationId,
      name: input.run.snapshot.title,
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

function appendInstructions(context: string, instructions: string) {
  return `${context}\n\n## Instructions\n\n${instructions.trim()}`
}
