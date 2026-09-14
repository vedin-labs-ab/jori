import { modelAvailabilityReason } from "@contracts/models/availability"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useCallback } from "react"
import { ChatComposer } from "@/shared/console/chat/composer"
import { ChatPane } from "@/shared/console/chat/pane"
import { useReplyReferences } from "@/shared/console/chat/pane/auto"
import { isLiveRun } from "@/shared/console/chat/types"
import { MaterialPlaceholder } from "@/shared/console/materials/detail/placeholder"
import { useDocumentTitle } from "@/shared/console/shell/title"
import { api } from "../../../convex/_generated/api"
import { type ReferenceTarget } from "../../shared/console/references"
import { ConsolePage } from "../page"
import { type LiveConversation, useConversation } from "./conversation"
import { ConversationFiling } from "./filing"
import { useAvailableModels } from "./models"
import { ConversationPaneBody } from "./pane"
import { ChatProgress } from "./progress"
import { ConversationTurns } from "./turns"

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

  useDocumentTitle(live.title === "" ? undefined : `${live.title} · Jori`)
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
          metadata={
            <ConversationFiling
              conversationId={conversationId}
              live={live}
              organizationId={organizationId}
            />
          }
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
        send={thread.send}
        progress={
          isLiveRun(live.run) ? (
            <ChatProgress organizationId={organizationId} run={live.run} />
          ) : null
        }
      />
    </ChatPane>
  )
}

/** The pane body and composer send keep their identity per conversation. */
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
  }
}
