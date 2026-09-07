import { useCallback } from "react"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { type ChatRun, type ReferenceTarget } from "@/shared/console/chat/types"
import { useNow } from "@/shared/console/time"
import { resolveReference } from "../../../derive/chat"
import { chatContext } from "../../../fixtures/chat"
import { liveDraft } from "../../../state/chat"
import { useDemoWorkspace } from "../../../workspace"

/** Another conversation's turns out of the workspace, with the reply
 *  being written to it as far as it has come. */
export function DemoPaneChat({
  conversationId,
  onOpenReference,
}: {
  conversationId: string
  onOpenReference: OpenTarget
}) {
  const { actions, state } = useDemoWorkspace()
  const conversation = state.chat.conversations.find(
    (candidate) => candidate.id === conversationId
  )
  const live = state.chat.live
  const run: ChatRun | null =
    live?.conversationId === conversationId ? live.run : null
  const now = useNow(60_000)
  const resolve = useCallback(
    (target: ReferenceTarget) => resolveReference(state, target),
    [state]
  )

  if (conversation === undefined) {
    return null
  }

  return (
    <ChatPaneBody
      material={{
        kind: "chat",
        thread: {
          draft: liveDraft(state.chat, conversationId),
          hasMore: false,
          isLoading: false,
          live: run,
          messages: conversation.messages,
          now,
          onChoose: (messageId, answers, text) =>
            actions.sendChatMessage(text, conversationId, {
              answer: { messageId, answers },
            }),
          onLoadMore: () => undefined,
          onOpenReference,
          resolveReference: resolve,
          usage: chatContext,
        },
      }}
    />
  )
}
