import { type RuntimeMessage } from "../../contracts/runtime/context"
import { type Doc } from "../_generated/dataModel"
import { messageHasText } from "../messages/data"
import {
  messageActorIds,
  messageIdentifiers,
  messageReplyTargetIdentifier,
} from "../messages/identifiers"
import { getActorDisplayName, getActorKind } from "../shared/actor"

export const defaultDrainLimit = 20
export const maxDrainLimit = 50
export const maxPendingReadLimit = maxDrainLimit + 1

type MessageCursor = NonNullable<
  NonNullable<Doc<"sessions">["cursor"]>["message"]
>

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
  const messageCursor = session.cursor?.message
  let seenLastMessage = messageCursor === undefined

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]

    if (message._id === messageCursor?.messageId) {
      seenLastMessage = true
      continue
    }

    if (!isAfterSessionCursor(message, messageCursor, seenLastMessage)) {
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
  reactions?: string
): RuntimeMessage {
  return {
    actor: getActorDisplayName(message.actor) ?? null,
    actorIds: messageActorIds(message),
    authority: message.actor?.kind === "person" ? "authoritative" : "soft",
    id: message._id,
    identifiers: messageIdentifiers(message),
    createdAt: message.createdAt,
    mentioned: message.mentioned,
    observedAt: message.observedAt ?? null,
    reactions: reactions ?? null,
    replyTarget: messageReplyTargetIdentifier(message),
    source: getActorKind(message.actor),
    text: message.text ?? "",
    type: message.type,
  }
}

function isAfterSessionCursor(
  message: Doc<"messages">,
  cursor: MessageCursor | undefined,
  seenLastMessage: boolean
) {
  if (cursor === undefined) {
    return true
  }

  if (message._creationTime < cursor.createdAt) {
    return false
  }

  return message._creationTime !== cursor.createdAt || seenLastMessage
}

function isRuntimeInputMessage(message: Doc<"messages">) {
  return messageHasText(message) && message.actor?.kind !== "self"
}
