import { type Doc } from "../_generated/dataModel"
import { messageActorIdentifierLabels, messageText } from "../messages/surface"
import { getActorDisplayName } from "../shared/actor"

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
  let seenLastMessage = session.cursor === undefined

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]

    if (message._id === session.cursor?.messageId) {
      seenLastMessage = true
      continue
    }

    if (!isAfterSessionCursor(message, session.cursor, seenLastMessage)) {
      continue
    }

    cursor = message

    if (isRuntimeInputMessage(message)) {
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

export function formatRuntimeMessage(
  message: Doc<"messages">,
  integration: Doc<"integrations"> | null
) {
  return {
    actor: getActorDisplayName(message.actor) ?? null,
    authority: message.actor?.kind === "user" ? "authoritative" : "soft",
    id: message._id,
    identifiers: messageActorIdentifierLabels(message),
    createdAt: message.createdAt,
    integration: message.integration,
    mentioned: message.mentioned,
    observedAt: message.observedAt ?? null,
    source: message.actor?.kind ?? "unknown",
    text:
      integration === null
        ? (message.text ?? "")
        : messageText(message, integration),
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
  cursor: Doc<"sessions">["cursor"],
  seenLastMessage: boolean
) {
  if (cursor === undefined) {
    return true
  }

  if (message._creationTime < cursor.timestamp) {
    return false
  }

  return message._creationTime !== cursor.timestamp || seenLastMessage
}

function hasText(message: Doc<"messages">) {
  const text = message.text?.trim()

  return text !== undefined && text !== ""
}

function isRuntimeInputMessage(message: Doc<"messages">) {
  return hasText(message) && message.actor?.kind !== "self"
}
