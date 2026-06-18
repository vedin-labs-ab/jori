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
import {
  formatEvent,
  formatTargetLines,
  getMessageDelivery,
  getMessageTarget,
  targetLine,
} from "./target"

export function assemblePrompt(
  input: AgentRuntimeInput,
  promptedTools: ToolPermission[] = [],
  continuation?: ApprovalContinuation
): string {
  const parts = [
    promptTemplates["system/persona"],
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

  return renderPromptTemplate(
    isInitialRun
      ? promptTemplates["trigger/message"]
      : promptTemplates["reference/message"],
    createMessageValues(input)
  )
}

function createMessageValues(
  input: Extract<AgentRuntimeInput, { type: "message" }>
) {
  return {
    message: {
      delivery: getMessageDelivery(input.messageIntegration),
      integration: getIntegrationLabel(input.messageIntegration),
      target: getMessageTarget(input.messageIntegration, input.message.data),
      text: input.message.text ?? "",
    },
    time: { utc: createPromptTime() },
  }
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

function formatAutomationTrigger(
  input: Extract<AgentRuntimeInput, { type: "automation" }>
) {
  const reason = input.run.reason

  if (reason.type === "time") {
    return `Time at ${new Date(reason.scheduledAt).toISOString()}`
  }

  if (reason.type === "event") {
    return "Integration event"
  }

  if (reason.type === "manual") {
    return "Manual"
  }

  return "Unknown"
}

function getIntegrationLabel(integration: MessageIntegration) {
  return integrationLabels[integration]
}
