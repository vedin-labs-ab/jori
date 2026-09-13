import { type GenericId } from "convex/values"
import { type ReactNode, useCallback } from "react"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { ChatThread, type ChooseHandler } from "@/shared/console/chat/thread"
import { type MentionSources } from "@/shared/console/mentions/sources"
import { type ResolveReference } from "@/shared/console/references"
import { useNow } from "@/shared/console/time"
import { type LiveConversation } from "./conversation"
import { ConversationDraft } from "./draft"
import { type useConversationMessages } from "./messages"
import { sendAnswer, type useSendMessage } from "./send"

/** The page and pane bind the same turns, draft, pagination, and answers.
 *  The page supplies its mention sources and live run progress. */
export function ConversationTurns({
  conversationId,
  live,
  mentions,
  onOpenReference,
  organizationId,
  page,
  progress,
  resolveReference,
  send,
}: {
  conversationId: GenericId<"conversations">
  live: Pick<LiveConversation, "run" | "context">
  mentions?: MentionSources
  onOpenReference: OpenTarget
  organizationId: string
  page: ReturnType<typeof useConversationMessages>
  progress?: ReactNode
  resolveReference: ResolveReference
  send: ReturnType<typeof useSendMessage>
}) {
  const run = live.run
  const now = useNow(60_000)
  const onChoose = useCallback<ChooseHandler>(
    (messageId, answers, text) =>
      sendAnswer(send, {
        conversationId,
        text,
        answer: { messageId: messageId as GenericId<"messages">, answers },
      }),
    [conversationId, send]
  )

  return (
    <ChatThread
      draft={
        <ConversationDraft
          conversationId={conversationId}
          organizationId={organizationId}
        />
      }
      hasMore={page.hasMore}
      isLoading={page.isLoading}
      live={run}
      mentions={mentions}
      messages={page.messages}
      now={now}
      onChoose={onChoose}
      onLoadMore={page.loadMore}
      onOpenReference={onOpenReference}
      progress={progress}
      resolveReference={resolveReference}
      usage={live.context}
    />
  )
}
