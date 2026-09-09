import { withUnicodeEmoji } from "../../../../contracts/emoji/convert"
import { readRecord, readString } from "../../../shared/input"
import { getLinearNotificationMessage } from "./notifications"

export type LinearWebhookPayload = {
  action?: string
  type?: string
  appUserId?: string
  oauthClientId?: string
  actor?: {
    id?: string
    type?: string
    name?: string
    email?: string
  }
  createdAt?: string
  data?: LinearComment
  notification?: unknown
  organizationId?: string
  updatedFrom?: Record<string, unknown>
  url?: string
  webhookId?: string
  webhookTimestamp?: number
}

type LinearComment = {
  id?: string
  body?: string
  issueId?: string
  parentId?: string
  parent?: {
    id?: string
  } | null
  issue?: {
    id?: string
    identifier?: string
    title?: string
    url?: string
    team?: {
      id?: string
      key?: string
      name?: string
    }
    project?: {
      id?: string
      name?: string
    } | null
  }
  url?: string
  createdAt?: string
  updatedAt?: string
}

export function getLinearMessage(args: {
  payload: LinearWebhookPayload
  deliveryId: string | null
}) {
  const eventType = args.payload.type
  const action = args.payload.action
  const accountId = args.payload.organizationId

  if (accountId === undefined || eventType === undefined) {
    return null
  }

  if (eventType === "AppUserNotification") {
    return getLinearNotificationMessage(
      args.payload,
      accountId,
      args.deliveryId,
      getLinearCommentMessage
    )
  }

  if (!isRelevantLinearEvent(eventType, action)) {
    return null
  }

  if (eventType === "Comment") {
    return getLinearCommentMessage(args.payload, accountId, args.deliveryId)
  }

  return null
}

export function getLinearReaction(args: { payload: LinearWebhookPayload }) {
  const action = args.payload.action
  const accountId = args.payload.organizationId

  if (
    args.payload.type !== "AppUserNotification" ||
    action !== "issueCommentReaction" ||
    accountId === undefined
  ) {
    return null
  }

  const notification = readRecord(args.payload.notification)
  const reaction = readReaction(notification)
  const comment = readRecordValue(notification, "comment")
  const issue = readRecordValue(notification, "issue")
  const commentId = readString(comment, "id")
  const issueId = readString(issue, "id") ?? readString(notification, "issueId")

  if (reaction === undefined || commentId === undefined) {
    return null
  }

  const actor = readActor(notification, args.payload)

  return {
    accountId,
    action: "added" as const,
    actorEmail: actor.email,
    actorId: actor.id,
    actorName: actor.name,
    observedAt: getObservedAt(args.payload, args.payload.createdAt),
    reaction,
    target: {
      key: `linear:comment:${commentId}`,
      identifiers: [
        ...(issueId === undefined ? [] : [`linear:issue:${issueId}`]),
        `linear:comment:${commentId}`,
      ],
      actorId: args.payload.appUserId,
      conversationId: issueId,
      text: readString(comment, "body"),
    },
  }
}

export function getLinearCommentMessage(
  payload: LinearWebhookPayload,
  accountId: string,
  deliveryId: string | null
) {
  const data = payload.data as LinearComment | undefined
  const issueId = data?.issueId ?? data?.issue?.id

  if (data === undefined || data.id === undefined || issueId === undefined) {
    return null
  }

  const action = payload.action ?? "create"

  return {
    accountId,
    type: `comment.${action}`,
    externalId: `linear:${accountId}:comment:${action}:${data.id}${action === "create" ? "" : `:${data.updatedAt ?? deliveryId ?? ""}`}`,
    appUserId: undefined as string | undefined,
    mentioned: false,
    actorId: payload.actor?.id,
    actorEmail: payload.actor?.email,
    actorKind: ["application", "bot"].includes(payload.actor?.type ?? "")
      ? ("bot" as const)
      : ("person" as const),
    actorName: payload.actor?.name,
    conversationId: issueId,
    text: humanReadableCommentText(data.body),
    observedAt: getObservedAt(payload, data.createdAt),
    data: {
      action: payload.action,
      eventType: payload.type,
      deliveryId,
      issueId,
      issueIdentifier: data.issue?.identifier,
      teamId: data.issue?.team?.id,
      projectId: data.issue?.project?.id,
      issue: data.issue,
      commentId: data.id,
      parentCommentId: data.parentId ?? data.parent?.id,
      url: payload.url ?? data.url,
    },
  }
}

function readReaction(notification: Record<string, unknown>) {
  return (
    readString(notification, "emoji") ??
    readString(notification, "reactionEmoji") ??
    readString(readRecordValue(notification, "reaction"), "emoji")
  )
}

function readActor(
  notification: Record<string, unknown>,
  payload: LinearWebhookPayload
) {
  const actor = readRecordValue(notification, "actor")

  return {
    email: readString(actor, "email") ?? payload.actor?.email,
    id: readString(actor, "id") ?? payload.actor?.id,
    name: readString(actor, "name") ?? payload.actor?.name,
  }
}

function readRecordValue(data: Record<string, unknown>, key: string) {
  return readRecord(data[key])
}

function isRelevantLinearEvent(type: string, action: string | undefined) {
  if (type === "Comment") {
    return action === undefined || action === "create" || action === "update"
  }

  return false
}

function getObservedAt(
  payload: LinearWebhookPayload,
  entityTimestamp: string | undefined
) {
  if (payload.webhookTimestamp !== undefined) {
    return payload.webhookTimestamp < 1_000_000_000_000
      ? payload.webhookTimestamp * 1000
      : payload.webhookTimestamp
  }

  const timestamp = entityTimestamp ?? payload.createdAt

  if (timestamp === undefined) {
    return undefined
  }

  const value = Date.parse(timestamp)

  return Number.isFinite(value) ? value : undefined
}

// Linear mentions are already readable names; only shortcodes need work.
function humanReadableCommentText(body: string | undefined) {
  return body === undefined ? undefined : withUnicodeEmoji(body)
}
