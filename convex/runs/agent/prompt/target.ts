import { integrationLabels } from "../../../automations/integrations"
import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import {
  readDataNumber,
  readDataObject,
  readDataString,
} from "../../../shared/data"
import { type AgentRuntimeInput, type MessageIntegration } from "../input"

export function getMessageTarget(
  integration: MessageIntegration,
  data: unknown
) {
  return formatTargetLines(getIntegrationTargetLines(integration, data))
}

export function getMessageDelivery(integration: MessageIntegration) {
  return renderPromptTemplate(promptTemplates["message/delivery"], {
    surface: {
      label: integrationLabels[integration],
    },
  }).trim()
}

export function getMessageProgress(integration: MessageIntegration) {
  return renderPromptTemplate(promptTemplates["message/progress"], {
    surface: {
      label: integrationLabels[integration],
    },
  }).trim()
}

export function formatEvent(
  event: Extract<AgentRuntimeInput, { type: "automation" }>["event"],
  integration: string | undefined
) {
  if (event === null) {
    return "- None"
  }

  return formatTargetLines([
    targetLine("Type", event.type),
    targetLine("Integration", formatIntegrationLabel(integration)),
    ...getIntegrationTargetLines(integration, event.data),
    targetLine("Text", event.text),
  ])
}

export function targetLine(label: string, value: string | number | undefined) {
  if (value === undefined || value === "") {
    return null
  }

  return `- ${label}: ${value}`
}

export function formatTargetLines(lines: Array<string | null>) {
  const present = lines.filter((line) => line !== null)

  return present.length === 0 ? "- None" : present.join("\n")
}

function formatIntegrationLabel(integration: string | undefined) {
  if (integration === undefined) {
    return undefined
  }

  return isKnownIntegration(integration)
    ? integrationLabels[integration]
    : integration
}

function getIntegrationTargetLines(
  integration: string | undefined,
  data: unknown
) {
  if (integration === "github") {
    return getGitHubTargetLines(data)
  }

  if (integration === "linear") {
    return getLinearTargetLines(data)
  }

  if (integration === "notion") {
    return getNotionTargetLines(data)
  }

  if (integration === "slack") {
    return getSlackTargetLines(data)
  }

  return []
}

function isKnownIntegration(
  integration: string
): integration is keyof typeof integrationLabels {
  return integration in integrationLabels
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
  const channel = readDataObject(data, "channel")
  const thread = readDataObject(data, "thread")
  const messageTs = readDataString(data, "ts")

  return [
    targetLine("Channel ID", readDataString(channel, "id")),
    targetLine("Message timestamp", messageTs),
    targetLine(
      "Reply thread timestamp",
      readDataString(thread, "ts") ?? messageTs
    ),
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
