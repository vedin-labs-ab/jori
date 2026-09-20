import { type Doc } from "../../_generated/dataModel"
import { getActorDisplayName, getActorKind } from "../../shared/actor"
import {
  messageActorIds,
  messageIdentifiers,
  messageReplyTargetIdentifier,
} from "./identifiers"

/** A message as the model reads it. */
export type RuntimeMessage = ReturnType<typeof formatRuntimeMessage> & {
  /** Resource and folder metadata, resolved for the execution audience. */
  context?: string
}

export function formatRuntimeMessage(
  message: Doc<"messages">,
  reactions?: string
) {
  return {
    actor: getActorDisplayName(message.actor) ?? null,
    actorIds: messageActorIds(message),
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
