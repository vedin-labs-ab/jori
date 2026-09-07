import { modelAvailabilityReason } from "@contracts/models/availability"
import { useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import { useCallback } from "react"
import { ChatComposer } from "@/shared/console/chat/composer"
import { ChatPane } from "@/shared/console/chat/pane"
import { useReplyReferences } from "@/shared/console/chat/pane/auto"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { ChatThread, type ChooseHandler } from "@/shared/console/chat/thread"
import {
  isLiveRun,
  type ReferenceTarget,
  type ResolveReference,
} from "@/shared/console/chat/types"
import { MaterialPlaceholder } from "@/shared/console/materials/detail/placeholder"
import { type MentionSources } from "@/shared/console/mentions/sources"
import { useNow } from "@/shared/console/time"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import {
  type LiveConversation,
  useConversation,
  useThreadChrome,
} from "./conversation"
import { ConversationDraft } from "./draft"
import { type useConversationMessages } from "./messages"
import { useAvailableModels } from "./models"
import { ConversationPaneBody } from "./pane"
import { ChatProgress } from "./progress"
import { sendAnswer } from "./send"

type SendAnswer = FunctionArgs<typeof api.conversations.console.send>["answer"]
type SendMessage = (text: string, answer?: SendAnswer) => void

/** One conversation with Jori: its turns, the run answering the latest
 *  one, the composer that sends into it, and beside them the pane the
 *  reply's resources open in. Keyed by the conversation, so a move to
 *  another starts its pane afresh. */
export function ConversationPage({
  conversationId,
}: {
  conversationId: GenericId<"conversations">
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <ConversationContent
          conversationId={conversationId}
          key={conversationId}
          organizationId={organizationId}
        />
      )}
    </ConsolePage>
  )
}

/** The live state answers first: it says whether the conversation is the
 *  person's to read, so the thread's own queries mount only when it is. */
function ConversationContent({
  conversationId,
  organizationId,
}: {
  conversationId: GenericId<"conversations">
  organizationId: string
}) {
  const live = useQuery(api.conversations.console.live, {
    organizationId,
    conversationId,
  })

  if (live === undefined) {
    return <MaterialPlaceholder noun="conversation" status="loading" />
  }

  if (live.status === "unauthorized") {
    return (
      <MaterialPlaceholder
        message={live.message}
        noun="conversation"
        status="unauthorized"
      />
    )
  }

  if (live.status === "not_found") {
    return <MaterialPlaceholder noun="conversation" status="not_found" />
  }

  return (
    <ConversationThread
      conversationId={conversationId}
      live={live}
      organizationId={organizationId}
    />
  )
}

/** The page's handlers keep their identity across renders, so the
 *  memoized composer, pane, and turns under them stay put while the run
 *  state and the draft move. */
function ConversationThread({
  conversationId,
  live,
  organizationId,
}: {
  conversationId: GenericId<"conversations">
  live: LiveConversation
  organizationId: string
}) {
  const thread = useConversation(organizationId, conversationId, live)
  const availableModels = useAvailableModels()
  const unavailable = modelAvailabilityReason(availableModels, live.model)
  const { openTarget, page, resolveReference } = thread
  const handlers = useThreadHandlers(organizationId, conversationId, thread)

  useThreadChrome(live.title)
  useReplyReferences(conversationId, page.messages, thread.autoOpen)

  return (
    <ChatPane
      {...thread.pane}
      body={handlers.body}
      composer={
        <ChatComposer
          autoFocus
          availableModels={availableModels}
          disabled={unavailable !== undefined}
          isLive={isLiveRun(live.run)}
          mentions={thread.mentions}
          onMention={thread.mentioned.open}
          onSelect={thread.choose}
          onSend={handlers.sendText}
          onStop={thread.stop}
          onUnmention={thread.releaseTarget}
          resolve={resolveReference}
          reason={unavailable}
          selection={live.model}
          usage={live.context}
        />
      }
      resolve={resolveReference}
    >
      <ConversationTurns
        conversationId={conversationId}
        live={live}
        mentions={thread.mentions}
        onOpenReference={openTarget}
        organizationId={organizationId}
        page={page}
        resolveReference={resolveReference}
        send={handlers.sendMessage}
      />
    </ChatPane>
  )
}

/** The pane's body for a target, the composer's send, and the turns'
 *  send, each made once per conversation. */
function useThreadHandlers(
  organizationId: string,
  conversationId: GenericId<"conversations">,
  { openTarget, send }: ReturnType<typeof useConversation>
) {
  return {
    body: useCallback(
      (target: ReferenceTarget) => (
        <ConversationPaneBody
          onOpenReference={openTarget}
          organizationId={organizationId}
          target={target}
        />
      ),
      [openTarget, organizationId]
    ),
    sendText: useCallback(
      (text: string, references: ReferenceTarget[]) =>
        send({
          conversationId,
          text,
          ...(references.length === 0 ? {} : { references }),
        }),
      [conversationId, send]
    ),
    sendMessage: useCallback<SendMessage>(
      (text, answer) =>
        sendAnswer(send, {
          conversationId,
          text,
          ...(answer === undefined ? {} : { answer }),
        }),
      [conversationId, send]
    ),
  }
}

/** The conversation's turns and, while Jori answers, the run's progress
 *  and its draft bound to Convex under the latest one. */
function ConversationTurns({
  conversationId,
  live,
  mentions,
  onOpenReference,
  organizationId,
  page,
  resolveReference,
  send,
}: {
  conversationId: GenericId<"conversations">
  live: LiveConversation
  mentions: MentionSources
  onOpenReference: OpenTarget
  organizationId: string
  page: ReturnType<typeof useConversationMessages>
  resolveReference: ResolveReference
  send: SendMessage
}) {
  const run = live.run
  const now = useNow(60_000)
  const onChoose = useCallback<ChooseHandler>(
    (messageId, answers, text) =>
      send(text, { messageId: messageId as GenericId<"messages">, answers }),
    [send]
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
      progress={
        isLiveRun(run) ? (
          <ChatProgress organizationId={organizationId} run={run} />
        ) : null
      }
      resolveReference={resolveReference}
      usage={live.context}
    />
  )
}
