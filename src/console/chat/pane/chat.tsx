import { useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { type GenericId } from "convex/values"
import { useCallback } from "react"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { type ChooseHandler } from "@/shared/console/chat/thread"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { useLatestCallback } from "@/shared/console/retain"
import { useNow } from "@/shared/console/time"
import { api } from "../../../../convex/_generated/api"
import { ConversationDraft } from "../draft"
import { useConversationMessages } from "../messages"
import { useReferences } from "../references"
import { sendAnswer, useSendMessage } from "../send"

type LiveConversation = Extract<
  FunctionReturnType<typeof api.conversations.console.live>,
  { status: "ready" }
>

/** Another conversation in the pane: its turns over the same page of
 *  messages its own page reads, with the reply being written as far as
 *  it has come. The live state answers first, so the messages mount only
 *  when the conversation is the person's to read. */
export function PaneChat({
  id,
  onOpenReference,
  organizationId,
}: {
  id: string
  onOpenReference: OpenTarget
  organizationId: string
}) {
  const conversationId = id as GenericId<"conversations">
  const live = useQuery(api.conversations.console.live, {
    organizationId,
    conversationId,
  })

  if (live === undefined) {
    return <ConsoleListLoading />
  }

  if (live.status !== "ready") {
    return null
  }

  return (
    <PaneTurns
      conversationId={conversationId}
      live={live}
      onOpenReference={onOpenReference}
      organizationId={organizationId}
    />
  )
}

function PaneTurns({
  conversationId,
  live,
  onOpenReference,
  organizationId,
}: {
  conversationId: GenericId<"conversations">
  live: LiveConversation
  onOpenReference: OpenTarget
  organizationId: string
}) {
  const page = useConversationMessages(organizationId, conversationId)
  const send = useLatestCallback(useSendMessage(organizationId))
  const resolveReference = useReferences(organizationId, page.messages)
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
    <ChatPaneBody
      material={{
        kind: "chat",
        thread: {
          draft: (
            <ConversationDraft
              conversationId={conversationId}
              organizationId={organizationId}
            />
          ),
          hasMore: page.hasMore,
          isLoading: page.isLoading,
          live: live.run,
          messages: page.messages,
          now,
          onChoose,
          onLoadMore: page.loadMore,
          onOpenReference,
          resolveReference,
          usage: live.context,
        },
      }}
    />
  )
}
