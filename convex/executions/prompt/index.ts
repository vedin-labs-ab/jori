import {
  type AutomationAccess,
  accessLabel,
  getIntegrationAccess,
  providerLabels,
} from "../../automations/access"
import { type ToolPermission } from "../../permissions/catalog"
import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import { createPromptTime } from "../../prompts/time"
import { type CodexRuntimeInput, type MessageProvider } from "../codex"
import { readDataNumber, readDataObject, readDataString } from "../data"
import {
  type ApprovalContinuation,
  createApprovalContinuationPrompt,
} from "./continuation"
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
      details: formatEvent(input.event, input.integration?.provider),
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
  event: Extract<CodexRuntimeInput, { type: "automation" }>["event"],
  provider: string | undefined
) {
  if (event === null) {
    return "- None"
  }

  return formatTargetLines([
    targetLine("Type", event.type),
    targetLine("Provider", formatProviderLabel(provider)),
    targetLine("Resource", event.resource),
    ...getProviderTargetLines(provider, event.data),
    targetLine("Text", event.text),
  ])
}

function getProviderLabel(provider: MessageProvider) {
  return providerLabels[provider]
}

function getMessageTarget(provider: MessageProvider, data: unknown) {
  return formatTargetLines(getProviderTargetLines(provider, data))
}

function formatProviderLabel(provider: string | undefined) {
  if (provider === undefined) {
    return undefined
  }

  return isKnownProvider(provider) ? providerLabels[provider] : provider
}

function getProviderTargetLines(provider: string | undefined, data: unknown) {
  if (provider === "github") {
    return getGitHubTargetLines(data)
  }

  if (provider === "linear") {
    return getLinearTargetLines(data)
  }

  if (provider === "notion") {
    return getNotionTargetLines(data)
  }

  if (provider === "slack") {
    return getSlackTargetLines(data)
  }

  return []
}

function isKnownProvider(
  provider: string
): provider is keyof typeof providerLabels {
  return provider in providerLabels
}

function getGitHubTargetLines(data: unknown) {
  const repository = readDataObject(data, "repository")
  const comment = readDataObject(data, "comment")
  const commentKind = readDataString(comment, "kind")

  return [
    targetLine("Repository", readDataString(repository, "fullName")),
    targetLine("Issue number", readDataNumber(data, "issueNumber")),
    targetLine("Pull request number", readDataNumber(data, "pullNumber")),
    targetLine("Comment ID", readDataString(comment, "id")),
    targetLine("Comment kind", commentKind),
    targetLine(
      "Review thread comment ID",
      commentKind === "pull_request_review"
        ? (readDataString(comment, "inReplyToId") ??
            readDataString(comment, "id"))
        : undefined
    ),
  ]
}

function getLinearTargetLines(data: unknown) {
  const issue = readDataObject(data, "issue")

  return [
    targetLine("Issue ID", readDataString(data, "issueId")),
    targetLine("Issue key", readDataString(data, "issueIdentifier")),
    targetLine("Issue title", readDataString(issue, "title")),
    targetLine("Issue URL", readDataString(issue, "url")),
    targetLine("Comment ID", readDataString(data, "commentId")),
    targetLine("Comment URL", readDataString(data, "url")),
  ]
}

function getSlackTargetLines(data: unknown) {
  return [
    targetLine("Channel ID", readDataString(data, "channelId")),
    targetLine("Message timestamp", readDataString(data, "ts")),
    targetLine("Thread timestamp", readDataString(data, "threadTs")),
  ]
}

function getNotionTargetLines(data: unknown) {
  const entity = readDataObject(data, "entity")
  const parent = readDataObject(data, "parent")

  return [
    targetLine("Page ID", readDataString(data, "pageId")),
    targetLine("Comment ID", readDataString(data, "commentId")),
    targetLine("Entity ID", readDataString(entity, "id")),
    targetLine("Entity type", readDataString(entity, "type")),
    targetLine("Parent ID", readDataString(parent, "id")),
    targetLine("Parent type", readDataString(parent, "type")),
    targetLine("Notion event ID", readDataString(data, "notionEventId")),
    targetLine("Notion event type", readDataString(data, "notionEventType")),
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
