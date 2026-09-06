import { useCallback } from "react"
import { ChatComposer } from "@/shared/console/chat/composer"
import { ChatHome } from "@/shared/console/chat/home"
import { referenceDestination } from "@/shared/console/chat/presentation"
import { ChatThread } from "@/shared/console/chat/thread"
import {
  type ChatRun,
  isLiveRun,
  type ReferenceTarget,
} from "@/shared/console/chat/types"
import { ChatWorking } from "@/shared/console/chat/working"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { ActivityTimeline } from "@/shared/console/runs/activity/item"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { conversationDestination } from "@/shared/console/shell/routes"
import { useNow } from "@/shared/console/time"
import { liveActivity, resolveReference } from "../../derive/chat"
import { chatSuggestions } from "../../fixtures/chat"
import { liveDraft } from "../../state/chat"
import { useDemoWorkspace } from "../../workspace"
import { useReplyStream } from "./stream"

/** Where a chat starts, over the workspace: the first message opens a
 *  conversation and the console moves to it. */
export function ChatHomePage() {
  const { actions, state } = useDemoWorkspace()
  const navigate = useConsoleNavigate()
  const now = useNow(60_000)
  const send = (text: string) => {
    const conversationId = actions.sendChatMessage(text)

    navigate(conversationDestination(conversationId))
  }

  return (
    <ChatHome
      composer={
        <ChatComposer autoFocus live={null} onSend={send} onStop={() => {}} />
      }
      now={now}
      onSuggestion={send}
      recent={state.chat.conversations}
      suggestions={chatSuggestions}
    />
  )
}

/** One conversation over the workspace: its turns, the run that answers
 *  the latest one with its log folded under the working row, and the
 *  composer bound to send into it. */
export function ConversationPage({
  conversationId,
}: {
  conversationId: string
}) {
  const { actions, state } = useDemoWorkspace()
  const navigate = useConsoleNavigate()
  const conversation = state.chat.conversations.find(
    (candidate) => candidate.id === conversationId
  )
  const live = state.chat.live
  const run: ChatRun | null =
    live?.conversationId === conversationId ? live.run : null
  const now = useNow(isLiveRun(run) ? 1000 : 60_000)
  const resolve = useCallback(
    (target: ReferenceTarget) => resolveReference(state, target),
    [state]
  )

  useReplyStream(live, actions)
  useMaterialBreadcrumb(conversation?.title ?? "")

  if (conversation === undefined) {
    return null
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatThread
        draft={liveDraft(state.chat, conversationId)}
        hasMore={false}
        isLoading={false}
        live={run}
        messages={conversation.messages}
        now={now}
        onChoose={(messageId, part, values, text) =>
          actions.sendChatMessage(text, conversationId, {
            answer: { messageId, part, values },
          })
        }
        onLoadMore={() => {}}
        onOpenReference={(target) => navigate(referenceDestination(target))}
        progress={
          live === null ? null : (
            <ChatWorking
              onStop={actions.stopChatRun}
              progress={
                <ActivityTimeline
                  items={liveActivity(live.startedAt)}
                  now={now}
                />
              }
            />
          )
        }
        resolveReference={resolve}
      />
      <ChatComposer
        autoFocus
        live={run}
        onSend={(text) => actions.sendChatMessage(text, conversationId)}
        onStop={actions.stopChatRun}
      />
    </div>
  )
}
