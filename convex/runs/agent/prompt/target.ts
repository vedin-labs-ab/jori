import { integrationLabels } from "../../../automations/integrations"
import {
  readDataNumber,
  readDataObject,
  readDataString,
} from "../../../shared/data"
import { type AgentRuntimeInput, type MessageIntegration } from "../input"

export function createMessageTargetValues(
  integration: MessageIntegration,
  data: unknown
) {
  return {
    github: integration === "github" ? getGitHubTargetValues(data) : null,
    linear: integration === "linear" ? getLinearTargetValues(data) : null,
    slack: integration === "slack" ? getSlackTargetValues(data) : null,
  }
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

export function targetLine(
  label: string,
  value: string | number | null | undefined
) {
  if (value === null || value === undefined || value === "") {
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
  const target = getGitHubTargetValues(data)

  return [
    targetLine("Repository", target.repository),
    targetLine("Issue number", target.issueNumber),
    targetLine("Pull request number", target.pullNumber),
    targetLine("Comment ID", target.commentId),
    targetLine("Comment kind", target.commentKind),
    targetLine("Review thread comment ID", target.reviewThreadCommentId),
  ]
}

function getGitHubTargetValues(data: unknown) {
  const repository = readDataObject(data, "repository")
  const comment = readDataObject(data, "comment")
  const commentKind = readDataString(comment, "kind")

  return {
    commentId: readDataString(comment, "id") ?? null,
    commentKind: commentKind ?? null,
    issueNumber: readDataNumber(data, "issueNumber") ?? null,
    pullNumber: readDataNumber(data, "pullNumber") ?? null,
    repository: readDataString(repository, "fullName") ?? null,
    reviewThreadCommentId:
      commentKind === "pull_request_review"
        ? (readDataString(comment, "inReplyToId") ??
          readDataString(comment, "id") ??
          null)
        : null,
  }
}

function getLinearTargetLines(data: unknown) {
  const target = getLinearTargetValues(data)

  return [
    targetLine("Issue ID", target.issueId),
    targetLine("Issue key", target.issueKey),
    targetLine("Issue title", target.issueTitle),
    targetLine("Issue URL", target.issueUrl),
    targetLine("Comment ID", target.commentId),
    targetLine("Comment URL", target.commentUrl),
  ]
}

function getLinearTargetValues(data: unknown) {
  const issue = readDataObject(data, "issue")

  return {
    commentId: readDataString(data, "commentId") ?? null,
    commentUrl: readDataString(data, "url") ?? null,
    issueId: readDataString(data, "issueId") ?? null,
    issueKey:
      readDataString(data, "issueIdentifier") ??
      readDataString(issue, "identifier") ??
      null,
    issueTitle: readDataString(issue, "title") ?? null,
    issueUrl: readDataString(issue, "url") ?? null,
  }
}

function getSlackTargetLines(data: unknown) {
  const target = getSlackTargetValues(data)

  return [
    targetLine("Channel ID", target.channelId),
    targetLine("Message timestamp", target.messageTimestamp),
    targetLine("Thread timestamp", target.threadTimestamp),
  ]
}

function getSlackTargetValues(data: unknown) {
  const channel = readDataObject(data, "channel")
  const thread = readDataObject(data, "thread")
  const messageTs = readDataString(data, "ts")

  return {
    channelId: readDataString(channel, "id") ?? null,
    messageTimestamp: messageTs ?? null,
    threadTimestamp: readDataString(thread, "ts") ?? messageTs ?? null,
  }
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
