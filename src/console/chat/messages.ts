import {
  readChoicesAnswer,
  readMessageContext,
  readMessageReferences,
} from "@contracts/replies/answers"
import { parseReplyParts } from "@contracts/replies/parts"
import { usePaginatedQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { type GenericId } from "convex/values"
import { useMemo } from "react"
import { type ChatMessage } from "@/shared/console/chat/types"
import { api } from "../../../convex/_generated/api"

export type MessageRow = FunctionReturnType<
  typeof api.messages.console.page
>["page"][number]

export const messagePageSize = 40

/** A stored message as the thread reads it: the parts, context,
 *  mentions, and answer its `data` carries parsed out, each absent when
 *  it is not there. */
export function toChatMessage(row: MessageRow): ChatMessage {
  const context = readMessageContext(row.data)
  const references = readMessageReferences(row.data)
  const answer = readChoicesAnswer(row.data)

  return {
    id: row.id,
    role: row.role,
    ...(row.author === undefined ? {} : { author: row.author }),
    text: row.text,
    parts: parseReplyParts(row.data),
    ...(context === undefined ? {} : { context }),
    ...(references.length === 0 ? {} : { references }),
    ...(answer === undefined ? {} : { answer }),
    createdAt: row.createdAt,
  }
}

/** The conversation's messages oldest first, and the page state behind
 *  the thread's "Show earlier messages". */
export function useConversationMessages(
  organizationId: string,
  conversationId: GenericId<"conversations">
) {
  const page = usePaginatedQuery(
    api.messages.console.page,
    { organizationId, conversationId },
    { initialNumItems: messagePageSize }
  )
  const messages = useMemo(
    () => page.results.map(toChatMessage).reverse(),
    [page.results]
  )

  return {
    hasMore: page.status === "CanLoadMore",
    isLoading:
      page.status === "LoadingFirstPage" || page.status === "LoadingMore",
    loadMore: () => page.loadMore(messagePageSize),
    messages,
  }
}
