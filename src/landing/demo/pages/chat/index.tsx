import { modelSlugs } from "@contracts/models/catalog"
import { type ModelSelection } from "@contracts/models/selection"
import { type ReferenceTarget } from "@contracts/replies/references"

import { useCallback, useMemo, useState } from "react"
import { ChatComposer } from "@/shared/console/chat/composer"
import { TypedPlaceholder } from "@/shared/console/chat/composer/placeholder"
import { useChatLocation } from "@/shared/console/chat/draft"
import { ChatHome } from "@/shared/console/chat/home"
import { ChatLocation } from "@/shared/console/chat/location"
import { ChatPane } from "@/shared/console/chat/pane"
import { useReplyReferences } from "@/shared/console/chat/pane/auto"
import { usePaneTabs } from "@/shared/console/chat/pane/tabs"
import {
  rotateSuggestions,
  shownSuggestions,
} from "@/shared/console/chat/suggestions"
import { ChatThread } from "@/shared/console/chat/thread"
import {
  type ChatMessage,
  type ChatRun,
  isLiveRun,
} from "@/shared/console/chat/types"
import { ChatWorking } from "@/shared/console/chat/working"
import { type MentionSources } from "@/shared/console/mentions/sources"
import { ActivityTimeline } from "@/shared/console/runs/activity/item"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { conversationDestination } from "@/shared/console/shell/routes"
import { useNow } from "@/shared/console/time"
import { type ResolveReference } from "../../../../shared/console/references"
import { chatViews, liveActivity, resolveReference } from "../../derive/chat"
import { mentionSources } from "../../derive/mentions"
import {
  chatContext,
  chatSelection,
  chatSuggestions,
  type DemoConversation,
} from "../../fixtures/chat"
import { type FolderId } from "../../fixtures/types"
import { type DemoLiveReply, type DemoState } from "../../state/types"
import { useDemoFolders, useDemoWorkspace } from "../../workspace"
import { DemoDraft } from "./draft"
import { DemoChatFiling } from "./filing"
import { DemoPaneBody } from "./pane"
import { useReplyStream } from "./stream"

const noMessages: ChatMessage[] = []

/** Where a chat starts, over the workspace: the first message opens a
 *  conversation and the console moves to it. Opened from a resource's
 *  page, its folder is suggested and the resource is mentioned inline. */
export function ChatHomePage({ context }: { context?: ReferenceTarget }) {
  return <Home context={context} key={`${context?.kind}:${context?.id}`} />
}

function Home({ context }: { context?: ReferenceTarget }) {
  const { actions, state } = useDemoWorkspace()
  const navigate = useConsoleNavigate()
  const now = useNow(60_000)
  const [selection, setSelection] = useState<ModelSelection>(chatSelection)
  const { phrases, suggestions } = useDemoSuggestions()
  const mentions = useMemo(() => mentionSources(state), [state])
  const reference =
    context === undefined ? undefined : resolveReference(state, context)
  const location = useChatLocation(reference)
  const folders = useDemoFolders()
  const send = (text: string, references: ReferenceTarget[] = []) => {
    const conversationId = actions.sendChatMessage(text, undefined, {
      folderId:
        location.folderId === null
          ? undefined
          : (location.folderId as FolderId),
      references,
    })

    navigate(conversationDestination(conversationId))
  }

  return (
    <ChatHome
      composer={
        <ChatComposer
          availableModels={modelSlugs}
          autoFocus
          initialReference={location.initialReference}
          metadata={
            <ChatLocation
              folderId={location.folderId}
              folders={folders}
              onChange={location.select}
            />
          }
          mentions={mentions}
          onSelect={setSelection}
          onSend={send}
          onStop={() => {}}
          placeholder={
            <TypedPlaceholder
              fallback="Tell Jori what needs doing"
              phrases={phrases}
            />
          }
          resolve={(target) => resolveReference(state, target)}
          selection={selection}
        />
      }
      now={now}
      onSuggestion={send}
      recent={chatViews(state)}
      suggestions={
        context === undefined ? suggestions.slice(0, shownSuggestions) : []
      }
    />
  )
}

function useDemoSuggestions() {
  const [suggestions] = useState(() => rotateSuggestions(chatSuggestions, 0))
  const [phrases] = useState(() =>
    suggestions.slice(shownSuggestions).map(({ text }) => text)
  )
  return { phrases, suggestions }
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
  const { mentions, resolve } = useWorkspaceBindings(state)
  const { autoOpen, openTarget, pane } = usePaneTabs()

  useReplyStream(live, actions)
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
      body={(target) => (
        <DemoPaneBody onOpenReference={openTarget} target={target} />
      )}
      composer={
        <DemoComposer
          conversation={conversation}
          mentions={mentions}
          resolve={resolve}
          run={run}
        />
      }
      resolve={resolve}
    >
      <ChatThread
        draft={<DemoDraft chat={state.chat} conversationId={conversationId} />}
        hasMore={false}
        isLoading={false}
        live={run}
        mentions={mentions}
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

/** What the chat's views read of the workspace: the resolver a reply's
 *  targets are named by, and what the composer can mention. */
function useWorkspaceBindings(state: DemoState) {
  return {
    mentions: useMemo(() => mentionSources(state), [state]),
    resolve: useCallback(
      (target: ReferenceTarget) => resolveReference(state, target),
      [state]
    ),
  }
}

/** The composer bound to send into the conversation, to stop the run
 *  answering it, and to hold the model the next one runs on. */
function DemoComposer({
  conversation,
  mentions,
  resolve,
  run,
}: {
  conversation: DemoConversation
  mentions: MentionSources
  resolve: ResolveReference
  run: ChatRun | null
}) {
  const { actions } = useDemoWorkspace()
  const [selection, setSelection] = useState<ModelSelection>(chatSelection)

  return (
    <ChatComposer
      availableModels={modelSlugs}
      autoFocus
      isLive={isLiveRun(run)}
      metadata={<DemoChatFiling conversation={conversation} />}
      mentions={mentions}
      onSelect={setSelection}
      onSend={(text, references) => {
        actions.sendChatMessage(text, conversation.id, { references })
      }}
      onStop={actions.stopChatRun}
      resolve={resolve}
      selection={selection}
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
  if (live === null || !isLiveRun(live.run)) {
    return null
  }

  return (
    <ChatWorking
      progress={
        <ActivityTimeline items={liveActivity(live.startedAt)} now={now} />
      }
    />
  )
}
