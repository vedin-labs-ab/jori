import {
  type AutomationAccess,
  getIntegrationTools,
} from "../../../automations/access"
import { integrationLabels } from "../../../automations/integrations"
import { messageEntry } from "../../../messages/history"
import {
  getToolPermission,
  type ToolPermission,
} from "../../../permissions/catalog"
import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { createPromptTime } from "../../../prompts/time"
import { type AgentRuntimeInput, type MessageIntegration } from "../input"
import { createCommunicationInstructions } from "./communication"
import { createToolApprovalInstructions } from "./instructions"
import { createSkillInstructions } from "./skills"
import {
  formatEvent,
  formatTargetLines,
  getMessageDelivery,
  getMessageTarget,
  targetLine,
} from "./target"

const startUpdateShapes = [
  "action first: start with the first concrete action",
  "lookup first: start with what you are checking now",
  "object first: start with the thing being worked on",
  "safeguard first: start with the approval, permission, or write boundary",
  "preparation first: start with what you will draft or prepare before acting",
] as const

export function assemblePrompt(
  input: AgentRuntimeInput,
  promptedTools: ToolPermission[] = []
): string {
  const communication = createCommunicationInstructions(input)
  const context = createContextInstructions()
  const skills = createSkillInstructions({
    omittedNames: omittedSkillNames(communication),
  })

  return renderPromptTemplate(promptTemplates["agent/initial"], {
    agent: {
      approvals: createApprovalInstructions(promptedTools),
      communication: promptBlock(communication?.body ?? ""),
      context,
      skills: promptBlock(skills),
      trigger: promptBlock(createTriggerPart(input, true)),
    },
  })
}

function omittedSkillNames(
  communication: ReturnType<typeof createCommunicationInstructions>
) {
  return new Set(communication === null ? [] : [communication.skill.name])
}

function createApprovalInstructions(promptedTools: ToolPermission[]) {
  return promptedTools.length === 0
    ? ""
    : promptBlock(createToolApprovalInstructions(promptedTools))
}

function createContextInstructions() {
  return renderPromptTemplate(promptTemplates["context/message"], {
    time: { utc: createPromptTime() },
  }).trim()
}

function promptBlock(value: string) {
  return value.trim()
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
  return {
    message: {
      conversation: formatMessageConversation(input),
      current: formatMessageEntry(
        messageEntry(input.message, input.integration)
      ),
      delivery: getMessageDelivery(input.messageIntegration),
      integration: getIntegrationLabel(input.messageIntegration),
      startUpdateShape: getStartUpdateShape(input.run._id),
      target: getMessageTarget(input.messageIntegration, input.message.data),
    },
  }
}

function getStartUpdateShape(seed: string) {
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return (
    startUpdateShapes[hash % startUpdateShapes.length] ?? startUpdateShapes[0]
  )
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

  return entries.map(formatMessageEntry).join("\n\n")
}

function formatMessageEntry(
  entry: Extract<AgentRuntimeInput, { type: "message" }>["conversation"][number]
) {
  const observed = entry.observedAt ?? entry.createdAt

  return renderPromptTemplate(promptTemplates["conversation/message"], {
    message: {
      actor: entry.actor ?? "unknown",
      identifiers: entry.identifiers.join(", "),
      observedAt: new Date(observed).toISOString(),
      speaker: entry.source,
      text: entry.text,
    },
  }).trim()
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
