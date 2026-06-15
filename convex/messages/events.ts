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
import { getSlackChannelId } from "../providers/slack/data"
import { type Actor } from "../shared/actor"

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
  resource?: string
  criteria?: Doc<"events">["criteria"]
  actor?: Actor
  text?: string
  data?: unknown
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
      resource: event.resource,
      criteria: event.criteria,
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
    baseEvent(message, {
      type: "message.created",
      resource: channelId,
      criteria: { channel: channelId },
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
      baseEvent(message, {
        type: pullRequestCommentEvent[action],
        criteria: {
          repo,
          pr: String(pullNumber ?? issueNumber),
        },
      }),
    ]
  }

  return [
    baseEvent(message, {
      type: issueCommentEvent[action],
      criteria: {
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
    baseEvent(message, {
      type: pullRequestReviewCommentEvent[action],
      criteria: {
        repo,
        pr: String(pullNumber),
        ...optionalCriterion("path", readNestedString(data, "comment", "path")),
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
    baseEvent(message, {
      type: issueCommentEvent[action],
      criteria: {
        issue: issueId,
        ...optionalCriterion("team", readString(data, "teamId")),
        ...optionalCriterion("project", readString(data, "projectId")),
      },
    }),
  ]
}

function baseEvent(
  message: AutomationEventMessage,
  event: Pick<AutomationEventRecord, "criteria" | "resource" | "type">
): AutomationEventRecord {
  return {
    key: message.externalId,
    type: event.type,
    resource: event.resource,
    criteria: event.criteria,
    actor: message.actor,
    text: message.text,
    data: message.data,
    observedAt: message.observedAt,
  }
}

function optionalCriterion(key: string, value: string | undefined) {
  return value === undefined ? {} : { [key]: value }
}

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function readString(data: Record<string, unknown>, key: string) {
  const value = data[key]

  return typeof value === "string" && value !== "" ? value : undefined
}

function readNumber(data: Record<string, unknown>, key: string) {
  const value = data[key]

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readBoolean(data: Record<string, unknown>, key: string) {
  return data[key] === true
}

function readNestedString(
  data: Record<string, unknown>,
  key: string,
  nestedKey: string
) {
  const nested = data[key]

  if (typeof nested !== "object" || nested === null) {
    return undefined
  }

  return readString(nested as Record<string, unknown>, nestedKey)
}
