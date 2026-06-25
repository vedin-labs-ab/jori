import { type Doc } from "../_generated/dataModel"
import {
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../providers/slack/data"
import { type ActorKind, getActorExternalId } from "../shared/actor"
import { readDataObject, readDataString } from "../shared/data"

export function messageIdentifiers(message: Doc<"messages">) {
  return [
    `internal:message:${message._id}`,
    ...surfaceIdentifiers(message),
  ].filter(unique)
}

export function messageActorIds(message: Doc<"messages">) {
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
  const threadId = readDataString(message.data, "parentCommentId") ?? commentId

  return [
    identifier("linear:issue", issueId),
    identifier("linear:comment", commentId),
    identifier("linear:thread", threadId),
  ]
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

function githubIdentifiers(message: Doc<"messages">) {
  const repository = readDataObject(message.data, "repository")
  const fullName = readDataString(repository, "fullName")
  const comment = readDataObject(message.data, "comment")

  return [
    identifier("github:repository", fullName),
    identifier("github:comment", readDataString(comment, "id")),
  ]
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

function unique(
  value: string | null,
  index: number,
  values: Array<string | null>
): value is string {
  return value !== null && values.indexOf(value) === index
}
