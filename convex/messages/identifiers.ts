import { type Doc } from "../_generated/dataModel"
import { githubActorId } from "../integrations/github/data"
import {
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../integrations/slack/data"
import { type ActorKind, getActorExternalId } from "../shared/actor"
import { readDataObject, readDataString } from "../shared/data"

export function messageIdentifiers(message: Doc<"messages">) {
  return [
    `internal:message:${message._id}`,
    ...surfaceIdentifiers(message),
  ].filter(unique)
}

export function messageReactionTargetIdentifiers(message: Doc<"messages">) {
  return surfaceIdentifiers(message).filter(unique)
}

export function messageReactionTargetKey(message: Doc<"messages">) {
  if (message.targetKey !== undefined) {
    return message.targetKey
  }

  return messageDataReactionTargetKey(message.integration, message.data)
}

export function messageDataReactionTargetKey(
  integration: string,
  data: unknown
) {
  if (integration === "linear") {
    return linearTargetKey(data)
  }

  if (integration === "slack") {
    return slackTargetKey(data)
  }

  if (integration === "github") {
    return githubTargetKey(data)
  }

  return undefined
}

export function messageActorIds(message: Doc<"messages">) {
  if (message.integration === "github") {
    return githubActorId(message.actor)
  }

  if (message.integration === "linear") {
    return actorId(message, linearActorIdPrefix)
  }

  if (message.integration === "slack") {
    return actorId(message, slackActorIdPrefix)
  }

  return []
}

export function messageReplyTargetIdentifier(message: Doc<"messages">) {
  if (message.integration === "linear") {
    return linearReplyTargetIdentifier(message)
  }

  return null
}

export function messageMatchesReplyTargetIdentifier(
  message: Doc<"messages">,
  target: string
) {
  const identifiers = messageIdentifiers(message)
  const commentIdentifier = commentIdentifierForThreadTarget(target)

  return (
    identifiers.includes(target) ||
    (commentIdentifier !== null && identifiers.includes(commentIdentifier))
  )
}

function surfaceIdentifiers(message: Doc<"messages">) {
  if (message.integration === "linear") {
    return linearIdentifiers(message)
  }

  if (message.integration === "slack") {
    return slackIdentifiers(message)
  }

  if (message.integration === "github") {
    return githubIdentifiers(message)
  }

  return []
}

function linearIdentifiers(message: Doc<"messages">) {
  const issueId = readDataString(message.data, "issueId")
  const commentId = readDataString(message.data, "commentId")
  const threadId = readDataString(message.data, "parentCommentId")

  return [
    identifier("linear:issue", issueId),
    identifier("linear:comment", commentId),
    identifier("linear:thread", threadId),
  ]
}

function linearTargetKey(data: unknown) {
  return (
    identifier("linear:comment", readDataString(data, "commentId")) ??
    identifier("linear:issue", readDataString(data, "issueId")) ??
    undefined
  )
}

function linearReplyTargetIdentifier(message: Doc<"messages">) {
  const parentCommentId = readDataString(message.data, "parentCommentId")
  const issueId = readDataString(message.data, "issueId")

  return (
    identifier("linear:thread", parentCommentId) ??
    identifier("linear:issue", issueId)
  )
}

function slackIdentifiers(message: Doc<"messages">) {
  const channelId = getSlackChannelId(message.data)
  const messageTs = getSlackMessageTs(message.data)
  const threadTs = getSlackThreadTs(message.data) ?? messageTs

  return [
    identifier("slack:channel", channelId),
    identifier("slack:message", messageTs),
    identifier("slack:thread", threadTs),
  ]
}

function slackTargetKey(data: unknown) {
  const channelId = getSlackChannelId(data)
  const messageTs = getSlackMessageTs(data)

  return channelId === undefined || messageTs === undefined
    ? undefined
    : `slack:message:${channelId}:${messageTs}`
}

function githubIdentifiers(message: Doc<"messages">) {
  const repository = readDataObject(message.data, "repository")
  const fullName = readDataString(repository, "fullName")
  const comment = readDataObject(message.data, "comment")
  const issueNumber = readDataStringValue(message.data, "issueNumber")
  const pullNumber = readDataStringValue(message.data, "pullNumber")

  return [
    identifier("github:repository", fullName),
    identifier("github:issue", issueNumberKey(fullName, issueNumber)),
    identifier("github:pull", issueNumberKey(fullName, pullNumber)),
    identifier("github:comment", readDataString(comment, "id")),
  ]
}

function githubTargetKey(data: unknown) {
  const repository = readDataObject(data, "repository")
  const fullName = readDataString(repository, "fullName")
  const comment = readDataObject(data, "comment")
  const commentId = readDataString(comment, "id")

  if (fullName !== undefined && commentId !== undefined) {
    return `github:comment:${fullName}:${commentId}`
  }

  const pullNumber = readDataStringValue(data, "pullNumber")
  const issueNumber = readDataStringValue(data, "issueNumber")
  const targetNumber = pullNumber ?? issueNumber
  const issueKey = issueNumberKey(fullName, targetNumber)

  if (issueKey === undefined) {
    return undefined
  }

  return `github:${pullNumber === undefined ? "issue" : "pull"}:${issueKey}`
}

function issueNumberKey(
  repository: string | undefined,
  number: string | undefined
) {
  return repository === undefined || number === undefined
    ? undefined
    : `${repository}#${number}`
}

function readDataStringValue(data: unknown, key: string) {
  const value = readDataString(data, key)

  if (value !== undefined) {
    return value
  }

  const numberValue = readDataNumberValue(data, key)

  return numberValue === undefined ? undefined : String(numberValue)
}

function readDataNumberValue(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined
}

function actorId(
  message: Doc<"messages">,
  prefix: (kind: ActorKind | undefined) => string
) {
  const externalId = getActorExternalId(message.actor)

  if (externalId === undefined || externalId === "") {
    return []
  }

  return [`${prefix(message.actor?.kind)}:${externalId}`]
}

function slackActorIdPrefix(kind: ActorKind | undefined) {
  return kind === "bot" ? "slack:bot" : "slack:user"
}

function linearActorIdPrefix(kind: ActorKind | undefined) {
  return kind === "bot" ? "linear:bot" : "linear:user"
}

function identifier(prefix: string, value: string | undefined) {
  return value === undefined || value === "" ? null : `${prefix}:${value}`
}

function commentIdentifierForThreadTarget(target: string) {
  const commentId = identifierValue(target, "linear:thread")

  return commentId === null ? null : `linear:comment:${commentId}`
}

function identifierValue(value: string, prefix: string) {
  const fullPrefix = `${prefix}:`
  const identifier = value.startsWith(fullPrefix)
    ? value.slice(fullPrefix.length)
    : null

  return identifier === "" ? null : identifier
}

function unique(
  value: string | null,
  index: number,
  values: Array<string | null>
): value is string {
  return value !== null && values.indexOf(value) === index
}
