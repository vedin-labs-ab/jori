import {
  type AutomationAccess,
  getIntegrationTools,
} from "../../../automations/access"
import { integrationLabels } from "../../../automations/integrations"
import {
  getToolPermission,
  type ToolPermission,
} from "../../../permissions/catalog"
import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { createPromptTime } from "../../../prompts/time"
import { type AgentRuntimeInput, type MessageIntegration } from "../input"
import {
  type ApprovalContinuation,
  createApprovalContinuationPrompt,
} from "./continuation"
import { createToolApprovalInstructions } from "./instructions"
import { createSkillInstructions } from "./skills"
import {
  formatEvent,
  formatTargetLines,
  getMessageDelivery,
  getMessageProgress,
  getMessageTarget,
  targetLine,
} from "./target"

export function assemblePrompt(
  input: AgentRuntimeInput,
  promptedTools: ToolPermission[] = [],
  continuation?: ApprovalContinuation
): string {
  const parts = [
    promptTemplates.persona,
    createSkillInstructions(input),
    ...(promptedTools.length === 0
      ? []
      : [createToolApprovalInstructions(promptedTools)]),
    createTriggerPart(input, continuation === undefined),
    ...(continuation === undefined
      ? []
      : [createApprovalContinuationPrompt(continuation)]),
  ]

  return parts.join("\n\n")
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
    time: { utc: createPromptTime() },
  }
}

function createMessageValues(
  input: Extract<AgentRuntimeInput, { type: "message" }>
) {
  return {
    message: {
      conversation: formatMessageConversation(input),
      delivery: getMessageDelivery(input.messageIntegration),
      integration: getIntegrationLabel(input.messageIntegration),
      progress: getMessageProgress(input.messageIntegration),
      routing: formatMessageRouting(input.routing),
      target: getMessageTarget(input.messageIntegration, input.message.data),
      text: input.message.text ?? "",
    },
    time: { utc: createPromptTime() },
  }
}

function formatMessageConversation(
  input: Extract<AgentRuntimeInput, { type: "message" }>
) {
  const entries = input.conversation.filter(
    (entry) => entry.id !== input.message._id
  )

  if (entries.length === 0) {
    return "- None"
  }

  return entries.map(formatMessageConversationEntry).join("\n\n")
}

function formatMessageConversationEntry(
  entry: Extract<AgentRuntimeInput, { type: "message" }>["conversation"][number]
) {
  const observed = entry.observedAt ?? entry.createdAt
  const actor = entry.actor === null ? "" : ` | actor=${entry.actor}`

  return [
    `- ${new Date(observed).toISOString()} | source=${entry.source} | authority=${entry.source === "user" ? "authoritative" : "soft"} | type=${entry.type}${actor}`,
    "```text",
    entry.text,
    "```",
  ].join("\n")
}

function createAutomationValues(
  input: Extract<AgentRuntimeInput, { type: "automation" }>
) {
  return {
    access: {
      summary: formatAutomationAccess(
        input.automation.access,
        input.integrations
      ),
    },
    automation: {
      id: input.automation._id,
      name: input.automation.name,
      instructions: input.automation.instructions,
      trigger: formatAutomationTrigger(input),
    },
    event: {
      details: formatEvent(input.event, input.integration?.integration),
    },
    time: { utc: createPromptTime() },
  }
}

function formatAutomationAccess(
  access: AutomationAccess,
  integrations: Extract<
    AgentRuntimeInput,
    { type: "automation" }
  >["integrations"]
) {
  return formatTargetLines([
    targetLine("Web search", access.web ? "Allowed" : "Disabled"),
    ...integrations.map((integration) =>
      targetLine(
        integrationLabels[integration.integration],
        formatSelectedTools(getIntegrationTools(access, integration._id))
      )
    ),
  ])
}

function formatSelectedTools(tools: readonly string[]) {
  if (tools.length === 0) {
    return "No tools"
  }

  return tools.map((tool) => getToolPermission(tool)?.label ?? tool).join(", ")
}

function formatMessageRouting(
  routing: Extract<AgentRuntimeInput, { type: "message" }>["routing"]
) {
  if (routing === null) {
    return "- None"
  }

  return formatTargetLines([
    targetLine("Intake route", routing.route),
    targetLine("Quick reply", routing.reply ?? undefined),
  ])
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
