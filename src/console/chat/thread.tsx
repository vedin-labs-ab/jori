import { useMutation, useQuery } from "convex/react"
import { type FunctionArgs, type FunctionReturnType } from "convex/server"
import { type GenericId } from "convex/values"
import { ChatComposer } from "@/shared/console/chat/composer"
import { ChatPane } from "@/shared/console/chat/pane"
import { useReplyReferences } from "@/shared/console/chat/pane/auto"
import { usePaneTabs } from "@/shared/console/chat/pane/tabs"
import { ChatThread } from "@/shared/console/chat/thread"
import {
  type ChatRun,
  isLiveRun,
  type ReferenceTarget,
  type ResolveReference,
} from "@/shared/console/chat/types"
import { showErrorToast } from "@/shared/console/error"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { MaterialPlaceholder } from "@/shared/console/materials/detail/placeholder"
import { useDocumentTitle } from "@/shared/console/shell/title"
import { useNow } from "@/shared/console/time"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { useConversationMessages } from "./messages"
import { ConversationPaneBody } from "./pane"
import { ChatProgress } from "./progress"
import { useReferences } from "./references"
import { useSendMessage } from "./send"

type LiveConversation = Extract<
  FunctionReturnType<typeof api.conversations.console.live>,
  { status: "ready" }
>
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
  const page = useConversationMessages(organizationId, conversationId)
  const send = useSendMessage(organizationId)
  const stop = useStopRun(organizationId, live.run)
  const resolveReference = useReferences(organizationId, page.messages)
  const { autoOpen, openTarget, pane } = usePaneTabs()

  useDocumentTitle(live.title === "" ? undefined : `${live.title} · Jori`)
  useMaterialBreadcrumb(live.title)
  useReplyReferences(conversationId, page.messages, autoOpen)

  return (
    <ChatPane
      {...pane}
      body={(target) => (
        <ConversationPaneBody organizationId={organizationId} target={target} />
      )}
      composer={
        <ChatComposer
          autoFocus
          live={live.run}
          onSend={(text) => void send({ conversationId, text })}
          onStop={stop}
          usage={live.context}
        />
      }
      resolve={resolveReference}
    >
      <ConversationTurns
        live={live}
        onOpenReference={openTarget}
        onStop={stop}
        organizationId={organizationId}
        page={page}
        resolveReference={resolveReference}
        send={(text, answer) =>
          void send({
            conversationId,
            text,
            ...(answer === undefined ? {} : { answer }),
          })
        }
      />
    </ChatPane>
  )
}

/** The conversation's turns and, while Jori answers, the run's progress
 *  bound to Convex under the latest one. */
function ConversationTurns({
  live,
  onOpenReference,
  onStop,
  organizationId,
  page,
  resolveReference,
  send,
}: {
  live: LiveConversation
  onOpenReference: (target: ReferenceTarget) => void
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

/** Stops the live run the way the Activity page does; a failure says so. */
function useStopRun(organizationId: string, run: ChatRun | null) {
  const stop = useMutation(api.runs.control.stop)

  return () => {
    if (run === null) {
      return
    }

    void stop({ organizationId, runId: run.id as GenericId<"runs"> }).catch(
      (error: unknown) => showErrorToast(error, "Couldn't stop the run.")
    )
  }
}
