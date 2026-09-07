import { useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import { ChatComposer } from "@/shared/console/chat/composer"
import { ChatPane } from "@/shared/console/chat/pane"
import { useReplyReferences } from "@/shared/console/chat/pane/auto"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { ChatThread } from "@/shared/console/chat/thread"
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
import { type useConversationMessages } from "./messages"
import { ConversationPaneBody } from "./pane"
import { ChatProgress } from "./progress"

type SendAnswer = FunctionArgs<typeof api.conversations.console.send>["answer"]

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
  const { pane, page, resolveReference } = thread

  useThreadChrome(live.title)
  useReplyReferences(conversationId, page.messages, thread.autoOpen)

  return (
    <ChatPane
      {...pane}
      body={paneBody(organizationId, thread.openTarget)}
      composer={
        <ChatComposer
          autoFocus
          live={live.run}
          mentions={thread.mentions}
          onMention={thread.mentioned.open}
          onSelect={thread.choose}
          onSend={(text, references) =>
            void thread.send({
              conversationId,
              text,
              ...(references.length === 0 ? {} : { references }),
            })
          }
          onStop={thread.stop}
          onUnmention={thread.releaseTarget}
          resolve={resolveReference}
          selection={live.model}
          usage={live.context}
        />
      }
      resolve={resolveReference}
    >
      <ConversationTurns
        live={live}
        mentions={thread.mentions}
        onOpenReference={thread.openTarget}
        onStop={thread.stop}
        organizationId={organizationId}
        page={page}
        resolveReference={resolveReference}
        send={(text, answer) =>
          void thread.send({
            conversationId,
            text,
            ...(answer === undefined ? {} : { answer }),
          })
        }
      />
    </ChatPane>
  )
}

/** The pane's body for whatever tab is active, bound to the organization
 *  and to the pane's own way of opening what a body names. */
function paneBody(organizationId: string, onOpenReference: OpenTarget) {
  return (target: ReferenceTarget) => (
    <ConversationPaneBody
      onOpenReference={onOpenReference}
      organizationId={organizationId}
      target={target}
    />
  )
}

/** The conversation's turns and, while Jori answers, the run's progress
 *  bound to Convex under the latest one. */
function ConversationTurns({
  live,
  mentions,
  onOpenReference,
  onStop,
  organizationId,
  page,
  resolveReference,
  send,
}: {
  live: LiveConversation
  mentions: MentionSources
  onOpenReference: OpenTarget
  onStop: () => void
  organizationId: string
  page: ReturnType<typeof useConversationMessages>
  resolveReference: ResolveReference
  send: (text: string, answer?: SendAnswer) => void
}) {
  const run = live.run
  const isLive = isLiveRun(run)
  const now = useNow(isLive ? 1000 : 60_000)

  return (
    <ChatThread
      draft={live.draft}
      hasMore={page.hasMore}
      isLoading={page.isLoading}
      live={run}
      mentions={mentions}
      messages={page.messages}
      now={now}
      onChoose={(messageId, answers, text) =>
        send(text, { messageId: messageId as GenericId<"messages">, answers })
      }
      onLoadMore={page.loadMore}
      onOpenReference={onOpenReference}
      progress={
        isLive ? (
          <ChatProgress
            now={now}
            onStop={onStop}
            organizationId={organizationId}
            run={run}
          />
        ) : null
      }
      resolveReference={resolveReference}
      usage={live.context}
    />
  )
}
