import { type MessageContext } from "@contracts/replies/answers"
import { useCallback } from "react"
import { ChatComposer } from "@/shared/console/chat/composer"
import { ChatHome } from "@/shared/console/chat/home"
import { ChatPane } from "@/shared/console/chat/pane"
import { useReplyReferences } from "@/shared/console/chat/pane/auto"
import { usePaneTabs } from "@/shared/console/chat/pane/tabs"
import { ChatThread } from "@/shared/console/chat/thread"
import {
  type ChatMessage,
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
import { chatContext, chatSuggestions } from "../../fixtures/chat"
import { liveDraft } from "../../state/chat"
import { type DemoLiveReply } from "../../state/types"
import { useDemoWorkspace } from "../../workspace"
import { DemoPaneBody } from "./pane"
import { useReplyStream } from "./stream"

const noMessages: ChatMessage[] = []

/** Where a chat starts, over the workspace: the first message opens a
 *  conversation and the console moves to it. Opened from a resource's
 *  page, the resource is the composer's chip and goes with the message. */
export function ChatHomePage({ context }: { context?: MessageContext }) {
  const { actions, state } = useDemoWorkspace()
  const navigate = useConsoleNavigate()
  const now = useNow(60_000)
  const reference =
    context === undefined ? undefined : resolveReference(state, context)
  const send = (text: string) => {
    const conversationId = actions.sendChatMessage(text, undefined, {
      context: reference === undefined ? undefined : context,
    })

    navigate(conversationDestination(conversationId))
  }

  return (
    <ChatHome
      composer={
        <ChatComposer
          autoFocus
          context={reference}
          live={null}
          onClearContext={() => navigate({ to: "/chat" })}
          onSend={send}
          onStop={() => {}}
        />
      }
      now={now}
      onSuggestion={send}
      recent={state.chat.conversations}
      suggestions={chatSuggestions}
    />
  )
}

/** One conversation over the workspace. Keyed by the conversation, so a
 *  move to another starts its pane afresh. */
export function ConversationPage({
  conversationId,
}: {
  conversationId: string
}) {
  return <Conversation conversationId={conversationId} key={conversationId} />
}

/** The conversation's turns, the run that answers the latest one with
 *  its log folded under the working row, the composer bound to send into
 *  it, and beside them the pane the reply's resources open in. */
function Conversation({ conversationId }: { conversationId: string }) {
  const { actions, state } = useDemoWorkspace()
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
  const { autoOpen, openTarget, pane } = usePaneTabs()

  useReplyStream(live, actions)
  useMaterialBreadcrumb(conversation?.title ?? "")
  useReplyReferences(
    conversationId,
    conversation?.messages ?? noMessages,
    autoOpen
  )

  if (conversation === undefined) {
    return null
  }

  return (
    <ChatPane
      {...pane}
      body={(target) => <DemoPaneBody target={target} />}
      composer={<DemoComposer conversationId={conversationId} run={run} />}
      resolve={resolve}
    >
      <ChatThread
        draft={liveDraft(state.chat, conversationId)}
        hasMore={false}
        isLoading={false}
        live={run}
        messages={conversation.messages}
        now={now}
        onChoose={(messageId, answers, text) =>
          actions.sendChatMessage(text, conversationId, {
            answer: { messageId, answers },
          })
        }
        onLoadMore={() => {}}
        onOpenReference={openTarget}
        progress={<LiveProgress live={live} now={now} />}
        resolveReference={resolve}
        usage={chatContext}
      />
    </ChatPane>
  )
}

/** The composer bound to send into the conversation, and to stop the
 *  run answering it. */
function DemoComposer({
  conversationId,
  run,
}: {
  conversationId: string
  run: ChatRun | null
}) {
  const { actions } = useDemoWorkspace()

  return (
    <ChatComposer
      autoFocus
      live={run}
      onSend={(text) => actions.sendChatMessage(text, conversationId)}
      onStop={actions.stopChatRun}
      usage={chatContext}
    />
  )
}

/** What the live run is doing, folded under the working row; nothing
 *  while no run is live. */
function LiveProgress({
  live,
  now,
}: {
  live: DemoLiveReply | null
  now: number
}) {
  const { actions } = useDemoWorkspace()

  if (live === null || !isLiveRun(live.run)) {
    return null
  }

  return (
    <ChatWorking
      onStop={actions.stopChatRun}
      progress={
        <ActivityTimeline items={liveActivity(live.startedAt)} now={now} />
      }
    />
  )
}
