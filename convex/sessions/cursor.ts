import { type Doc } from "../_generated/dataModel"

export const defaultDrainLimit = 20
export const maxDrainLimit = 50
export const maxPendingReadLimit = maxDrainLimit + 1

export type PendingBatch = {
  cursor?: Doc<"messages">
  hasMore: boolean
  messages: Doc<"messages">[]
}

export function collectPendingBatch(
  messages: Doc<"messages">[],
  session: Doc<"sessions">,
  limit: number,
  hasMore: boolean
) {
  const pending: Doc<"messages">[] = []
  let cursor: Doc<"messages"> | undefined
  let seenLastMessage = session.lastConsumedMessageId === undefined

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]

    if (message._id === session.lastConsumedMessageId) {
      seenLastMessage = true
      continue
    }

    if (!isAfterSessionCursor(message, session, seenLastMessage)) {
      continue
    }

    cursor = message

    if (hasText(message)) {
      pending.push(message)
    }

    if (pending.length === limit) {
      return {
        cursor,
        hasMore: hasMore || index < messages.length - 1,
        messages: pending,
      }
    }
  }

  return { cursor, hasMore, messages: pending }
}

export function formatRuntimeMessage(message: Doc<"messages">) {
  return {
    id: message._id,
    createdAt: message.createdAt,
    integration: message.integration,
    observedAt: message.observedAt ?? null,
    text: message.text ?? "",
    type: message.type,
  }
}

export function normalizeLimit(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) {
    return defaultDrainLimit
  }

  return Math.min(Math.max(1, Math.trunc(limit)), maxDrainLimit)
}

function isAfterSessionCursor(
  message: Doc<"messages">,
  session: Doc<"sessions">,
  seenLastMessage: boolean
) {
  if (session.lastConsumedAt === undefined) {
    return true
  }

  if (message._creationTime < session.lastConsumedAt) {
    return false
  }

  return message._creationTime !== session.lastConsumedAt || seenLastMessage
}

function hasText(message: Doc<"messages">) {
  const text = message.text?.trim()

  return text !== undefined && text !== ""
}
