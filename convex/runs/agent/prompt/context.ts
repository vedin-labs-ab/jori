import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import {
  createLocalPromptTime,
  createPromptTime,
} from "../../../../prompts/time"
import { replyAddress } from "../../../messages/targets"
import {
  integrationLabels,
  type MessageSurface,
  messageSurfaceLabel,
} from "../../../shared/integrations"
import { type AgentRuntimeInput } from "../input"
import { createMessageConversationValues } from "./conversation"
import { createMessageTargetValues, formatEvent } from "./target"

export type PromptActiveSurface = {
  surface: MessageSurface
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
  })
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
    ? { surface: input.surface }
    : null
}

function createRunInstructions(
  input: AgentRuntimeInput,
  activeSurface: PromptActiveSurface | null
) {
  return renderPromptTemplate(promptTemplates["agent/context/run"], {
    run: {
      id: input.run._id,
    },
    surface: {
      active: activeSurface !== null,
      label:
        activeSurface === null
          ? null
          : messageSurfaceLabel(activeSurface.surface),
    },
    time: promptTime(input),
  })
}

/** The run's clock is the moment it was created, not the moment a turn runs.
 *  The prompt prefix is rebuilt for every model call, and the provider only
 *  serves a cached prefix that matches byte for byte, so a timestamp that
 *  moved with each turn would re-bill the whole transcript every time. */
function promptTime(input: AgentRuntimeInput) {
  const startedAt = new Date(input.run.createdAt)

  return {
    utc: createPromptTime(startedAt),
    local:
      typeof input.timezone === "string"
        ? createLocalPromptTime(input.timezone, startedAt)
        : null,
  }
}

function createTriggerPart(input: AgentRuntimeInput) {
  if (input.type === "job") {
    return appendInstructions(
      renderPromptTemplate(
        promptTemplates["agent/context/trigger/job"],
        createJobValues(input)
      ),
      input.instructions
    )
  }

  if (input.type === "instruction") {
    return appendInstructions(
      renderPromptTemplate(
        promptTemplates["agent/context/trigger/instruction"],
        {
          run: {
            delegated: input.run.parentId !== undefined,
          },
        }
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
  const target = createMessageTargetValues(input.surface, input.message.data)
  const conversation = createMessageConversationValues(input)

  return {
    message: {
      conversation: conversation.body,
      conversationSummary: conversation.summary,
      current: conversation.current,
      github: target.github,
      integration: messageSurfaceLabel(input.surface),
      linear: target.linear,
      surface: input.surface,
    },
  }
}

function createJobValues(input: Extract<AgentRuntimeInput, { type: "job" }>) {
  return {
    job: {
      id: input.run.job?.id,
      name: input.run.snapshot.title,
      cause: input.run.cause.type,
      trigger: formatJobTrigger(input),
    },
    event:
      input.event === null
        ? null
        : {
            details: formatEvent(input.event, input.integration?.integration),
          },
  }
}

function formatJobTrigger(input: Extract<AgentRuntimeInput, { type: "job" }>) {
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

function appendInstructions(context: string, instructions: string) {
  return `${context}\n\n## Instructions\n\n${instructions.trim()}`
}
