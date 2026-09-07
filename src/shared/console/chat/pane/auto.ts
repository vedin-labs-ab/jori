import { useEffect, useRef } from "react"
import { type ChatMessage, lastMessage, type ReferenceTarget } from "../types"

/** Opens the first resource a new reply names, once per reply. Only a
 *  reply that lands while the conversation is on screen counts: what the
 *  thread already held when it opened stays where it is, and a move to
 *  another conversation starts the watch over. */
export function useReplyReferences(
  conversationId: string,
  messages: ChatMessage[],
  autoOpen: (target: ReferenceTarget) => void
) {
  const reply = lastMessage(messages, "jori")
  const replyId = reply?.id
  const target = useRef<ReferenceTarget>(undefined)
  const seen = useRef<{
    conversationId: string
    replyId: string | undefined
  }>(undefined)

  target.current = reply === undefined ? undefined : firstReference(reply)

  useEffect(() => {
    if (seen.current?.conversationId !== conversationId) {
      seen.current = { conversationId, replyId }

      return
    }

    if (seen.current.replyId === replyId) {
      return
    }

    seen.current = { conversationId, replyId }

    if (target.current !== undefined) {
      autoOpen(target.current)
    }
  }, [autoOpen, conversationId, replyId])
}

function firstReference(message: ChatMessage) {
  const part = message.parts.find((candidate) => candidate.kind === "reference")

  return part?.kind === "reference" ? part.target : undefined
}
