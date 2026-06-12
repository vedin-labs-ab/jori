import {
  type AutomationAccess,
  accessLabel,
  getIntegrationAccess,
  providerLabels,
} from "../automations/access"
import { type ToolPermission } from "../permissions/catalog"
import { promptTemplates } from "../prompts/generated"
import { renderPromptTemplate } from "../prompts/render"
import { createPromptTime } from "../prompts/time"
import { type CodexRuntimeInput, type MessageProvider } from "./codex"
import {
  type ApprovalContinuation,
  createApprovalContinuationPrompt,
} from "./continuation"
import { readDataNumber, readDataObject, readDataString } from "./data"
import { createToolApprovalInstructions } from "./instructions"

export function assemblePrompt(
  input: CodexRuntimeInput,
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

function createTriggerPart(input: CodexRuntimeInput, isInitialRun: boolean) {
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
  input: Extract<CodexRuntimeInput, { type: "message" }>
) {
  return {
    message: {
      provider: getProviderLabel(input.provider),
      target: getMessageTarget(input.provider, input.message.data),
      text: input.message.text ?? "",
    },
    time: { utc: createPromptTime() },
  }
}

function createAutomationValues(
  input: Extract<CodexRuntimeInput, { type: "automation" }>
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
      metadata: JSON.stringify(input.automation.metadata ?? null),
      trigger: formatAutomationTrigger(input),
    },
    event: {
      details: formatEvent(input.event),
    },
    time: { utc: createPromptTime() },
  }
}

function formatAutomationAccess(
  access: AutomationAccess,
  integrations: Extract<
    CodexRuntimeInput,
    { type: "automation" }
  >["integrations"]
) {
  return formatTargetLines([
    targetLine(
      "Read scope",
      access.read === "all"
        ? "All connected integrations"
        : "Selected integrations only"
    ),
    targetLine("Web search", access.web ? "Allowed" : "Disabled"),
    ...integrations.map((integration) =>
      targetLine(
        providerLabels[integration.provider],
        accessLabel(getIntegrationAccess(access, integration._id))
      )
    ),
  ])
}

function formatAutomationTrigger(
  input: Extract<CodexRuntimeInput, { type: "automation" }>
) {
  const reason = input.run.reason

  if (reason.type === "time") {
    return `Time at ${new Date(reason.scheduledAt).toISOString()}`
  }

  if (reason.type === "event") {
    return "Provider event"
  }

  if (reason.type === "manual") {
    return "Manual"
  }

  return "Unknown"
}

function formatEvent(
  event: Extract<CodexRuntimeInput, { type: "automation" }>["event"]
) {
  if (event === null) {
    return "- None"
  }

  return formatTargetLines([
    targetLine("Type", event.type),
    targetLine("Resource", event.resource),
    targetLine("Text", event.text),
  ])
}

const providerLabelsForMessages = {
  github: "GitHub",
  linear: "Linear",
  slack: "Slack",
} satisfies Record<MessageProvider, string>

function getProviderLabel(provider: MessageProvider) {
  return providerLabelsForMessages[provider]
}

function getMessageTarget(provider: MessageProvider, data: unknown) {
  if (provider === "github") {
    return formatTargetLines(getGitHubTargetLines(data))
  }

  if (provider === "linear") {
    return formatTargetLines(getLinearTargetLines(data))
  }

  return formatTargetLines(getSlackTargetLines(data))
}

function getGitHubTargetLines(data: unknown) {
  const repository = readDataObject(data, "repository")
  const comment = readDataObject(data, "comment")

  return [
    targetLine("Repository", readDataString(repository, "fullName")),
    targetLine("Issue number", readDataNumber(data, "issueNumber")),
    targetLine("Pull request number", readDataNumber(data, "pullNumber")),
    targetLine("Comment ID", readDataString(comment, "id")),
    targetLine("Comment kind", readDataString(comment, "kind")),
  ]
}

function getLinearTargetLines(data: unknown) {
  return [
    targetLine("Issue ID", readDataString(data, "issueId")),
    targetLine("Comment ID", readDataString(data, "commentId")),
  ]
}

function getSlackTargetLines(data: unknown) {
  return [
    targetLine("Channel ID", readDataString(data, "channelId")),
    targetLine("Message timestamp", readDataString(data, "ts")),
    targetLine("Thread timestamp", readDataString(data, "threadTs")),
  ]
}

function targetLine(label: string, value: string | number | undefined) {
  if (value === undefined || value === "") {
    return null
  }

  return `- ${label}: ${value}`
}

function formatTargetLines(lines: Array<string | null>) {
  const present = lines.filter((line) => line !== null)

  return present.length === 0 ? "- None" : present.join("\n")
}
