export type LinearWebhookPayload = {
  action?: string
  type?: string
  actor?: {
    id?: string
    type?: string
    name?: string
    email?: string
  }
  createdAt?: string
  data?: LinearComment
  organizationId?: string
  url?: string
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

  if (!isRelevantLinearEvent(eventType, action)) {
    return null
  }

  if (eventType === "Comment") {
    return getLinearCommentMessage(args.payload, accountId, args.deliveryId)
  }

  return null
}

function getLinearCommentMessage(
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
    externalId: createLinearExternalId(
      accountId,
      deliveryId,
      `${action}:${data.id}:${data.updatedAt ?? data.createdAt ?? ""}`
    ),
    actorId: payload.actor?.id,
    actorEmail: payload.actor?.email,
    actorKind:
      payload.actor?.type === "application"
        ? ("bot" as const)
        : ("user" as const),
    actorName: payload.actor?.name,
    conversationId: issueId,
    text: data.body,
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

function isRelevantLinearEvent(type: string, action: string | undefined) {
  if (type === "Comment") {
    return action === undefined || action === "create" || action === "update"
  }

  return false
}

function createLinearExternalId(
  accountId: string,
  deliveryId: string | null,
  fallbackKey: string
) {
  return `linear:${accountId}:${deliveryId ?? fallbackKey}`
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
