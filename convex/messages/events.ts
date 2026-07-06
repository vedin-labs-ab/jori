import { type Integration } from "../../contracts/integrations"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  githubCommentEventAction,
  issueCommentEvent,
  linearCommentEventAction,
  pullRequestCommentEvent,
  pullRequestReviewCommentEvent,
} from "../automations/names"
import { recordEvent } from "../events/data"
import { normalizeEventData } from "../events/payload"
import { type EventData, type EventMatch } from "../events/schema"
import { getSlackChannelId } from "../providers/slack/data"
import { type Actor } from "../shared/actor"
import { readNumber, readRecord, readString, readValue } from "../shared/input"

type AutomationEventMessage = {
  externalId: string
  actor?: Actor
  text?: string
  data?: unknown
  observedAt?: number
}

type AutomationEventRecord = {
  key: string
  type: string
  match?: EventMatch
  actor?: Actor
  text?: string
  data?: EventData
  observedAt?: number
}

export async function recordAutomationEvent(
  ctx: MutationCtx,
  input: {
    integration: Doc<"integrations">
    message: AutomationEventMessage
    now: number
  }
) {
  for (const event of readAutomationEventsForMessage(input)) {
    await recordEvent(ctx, {
      integration: input.integration,
      key: event.key,
      type: event.type,
      match: event.match,
      actor: event.actor,
      text: event.text,
      data: event.data,
      observedAt: event.observedAt,
      now: input.now,
    })
  }
}

export function readAutomationEventsForMessage(input: {
  integration: Pick<Doc<"integrations">, "integration">
  message: AutomationEventMessage
}): AutomationEventRecord[] {
  if (input.integration.integration === "slack") {
    return readSlackAutomationEvents(input.message)
  }

  if (input.integration.integration === "github") {
    return readGitHubAutomationEvents(input.message)
  }

  if (input.integration.integration === "linear") {
    return readLinearAutomationEvents(input.message)
  }

  return []
}

function readSlackAutomationEvents(message: AutomationEventMessage) {
  const channelId = getSlackChannelId(message.data)

  if (channelId === undefined) {
    return []
  }

  return [
    baseEvent("slack", message, {
      type: "message.created",
      match: { channel: channelId },
    }),
  ]
}

function readGitHubAutomationEvents(message: AutomationEventMessage) {
  const data = readRecord(message.data)
  const eventType = readString(data, "eventType")

  if (eventType === "issue_comment") {
    return readGitHubIssueCommentEvent(message, data)
  }

  if (eventType === "pull_request_review_comment") {
    return readGitHubPullRequestReviewCommentEvent(message, data)
  }

  return []
}

function readGitHubIssueCommentEvent(
  message: AutomationEventMessage,
  data: Record<string, unknown>
) {
  const repo = readNestedString(data, "repository", "fullName")
  const issueNumber = readNumber(data, "issueNumber")
  const pullNumber = readNumber(data, "pullNumber")
  const action = githubCommentEventAction(readString(data, "action"))

  if (repo === undefined || issueNumber === undefined || action === undefined) {
    return []
  }

  if (readBoolean(data, "isPullRequest")) {
    return [
      baseEvent("github", message, {
        type: pullRequestCommentEvent[action],
        match: {
          repo,
          pr: String(pullNumber ?? issueNumber),
        },
      }),
    ]
  }

  return [
    baseEvent("github", message, {
      type: issueCommentEvent[action],
      match: {
        repo,
        issue: String(issueNumber),
      },
    }),
  ]
}

function readGitHubPullRequestReviewCommentEvent(
  message: AutomationEventMessage,
  data: Record<string, unknown>
) {
  const repo = readNestedString(data, "repository", "fullName")
  const pullNumber = readNumber(data, "pullNumber")
  const action = githubCommentEventAction(readString(data, "action"))

  if (repo === undefined || pullNumber === undefined || action === undefined) {
    return []
  }

  return [
    baseEvent("github", message, {
      type: pullRequestReviewCommentEvent[action],
      match: {
        repo,
        pr: String(pullNumber),
        ...optionalMatch("path", readNestedString(data, "comment", "path")),
      },
    }),
  ]
}

function readLinearAutomationEvents(message: AutomationEventMessage) {
  const data = readRecord(message.data)
  const issueId = readString(data, "issueId")
  const action = linearCommentEventAction(readString(data, "action"))

  if (issueId === undefined || action === undefined) {
    return []
  }

  return [
    baseEvent("linear", message, {
      type: issueCommentEvent[action],
      match: {
        issue: issueId,
        ...optionalMatch("team", readString(data, "teamId")),
        ...optionalMatch("project", readString(data, "projectId")),
      },
    }),
  ]
}

function baseEvent(
  integration: Integration,
  message: AutomationEventMessage,
  event: Pick<AutomationEventRecord, "match" | "type">
): AutomationEventRecord {
  return {
    key: message.externalId,
    type: event.type,
    match: event.match,
    actor: message.actor,
    text: message.text,
    data: normalizeEventData(integration, message.data),
    observedAt: message.observedAt,
  }
}

function optionalMatch(key: string, value: string | undefined) {
  return value === undefined ? {} : { [key]: value }
}

function readBoolean(data: Record<string, unknown>, key: string) {
  return data[key] === true
}

function readNestedString(
  data: Record<string, unknown>,
  key: string,
  nestedKey: string
) {
  return readString(readValue(data, key), nestedKey)
}
