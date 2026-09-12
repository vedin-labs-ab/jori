import { type Doc } from "../_generated/dataModel"
import { messageHasText } from "../messages/data"

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
