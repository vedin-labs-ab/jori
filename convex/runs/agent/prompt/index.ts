import {
  type AutomationAccess,
  getIntegrationTools,
} from "../../../automations/access"
import { integrationLabels } from "../../../automations/integrations"
import { messageEntry } from "../../../messages/history"
import { replyAddress } from "../../../messages/surface"
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
  createMessageTargetValues,
  formatEvent,
  formatTargetLines,
  targetLine,
} from "./target"

export function assemblePrompt(
  input: AgentRuntimeInput,
  options: {
    activeSurface?: PromptActiveSurface | null
    promptedTools?: ToolPermission[]
  } = {}
): string {
  const communication = createCommunicationInstructions(input)
  const run = createRunInstructions(input)
  const activeSurface = options.activeSurface ?? defaultActiveSurface(input)
  const promptedTools = options.promptedTools ?? []
  const skills = createSkillInstructions({
    omittedNames: omittedSkillNames(communication),
  })

  return renderPromptTemplate(promptTemplates["agent/initial"], {
    agent: {
      approvals: optionalPromptBlock(createApprovalInstructions(promptedTools)),
      communication: optionalPromptBlock(communication?.body ?? ""),
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
      finish_run: true,
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
  return new Set(communication === null ? [] : [communication.skill.name])
}

function createApprovalInstructions(promptedTools: ToolPermission[]) {
  return promptedTools.length === 0
    ? ""
    : promptBlock(createToolApprovalInstructions(promptedTools))
}

function createRunInstructions(input: AgentRuntimeInput) {
  return renderPromptTemplate(promptTemplates["run/message"], {
    surface: { label: getActiveSurfaceLabel(input) },
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

  return {
    message: {
      conversation: formatMessageConversation(input),
      current: formatMessageEntry(
        messageEntry(input.message, input.integration)
      ),
      github: target.github,
      integration: getIntegrationLabel(input.messageIntegration),
      linear: target.linear,
      slack: target.slack,
      surface: input.messageIntegration,
    },
  }
}

function getActiveSurfaceLabel(input: AgentRuntimeInput) {
  return input.type === "message"
    ? getIntegrationLabel(input.messageIntegration)
    : "None"
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
