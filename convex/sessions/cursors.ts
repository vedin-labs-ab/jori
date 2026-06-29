import { type Doc } from "../_generated/dataModel"

type SessionCursor = NonNullable<Doc<"sessions">["cursor"]>

export function initialCursor(
  message: Doc<"messages">,
  reactionUpdatedAt: number
): SessionCursor {
  return {
    message: messageCursor(message),
    reaction: {
      createdAt: reactionUpdatedAt,
      updatedAt: reactionUpdatedAt,
    },
  }
}

export function cursorWithMessage(
  cursor: Doc<"sessions">["cursor"],
  message: Doc<"messages">
): SessionCursor {
  return {
    ...cursor,
    message: messageCursor(message),
  }
}

export function cursorWithReaction(
  cursor: Doc<"sessions">["cursor"],
  reaction: Doc<"reactions">
): SessionCursor {
  return {
    ...cursor,
    reaction: {
      createdAt: reaction._creationTime,
      updatedAt: reaction.updatedAt,
    },
  }
}

function messageCursor(message: Doc<"messages">) {
  return {
    createdAt: message._creationTime,
    messageId: message._id,
  }
}
