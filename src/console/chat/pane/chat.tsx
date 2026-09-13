import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { useLatestCallback } from "@/shared/console/retain"
import { api } from "../../../../convex/_generated/api"
import { type LiveConversation } from "../conversation"
import { ConversationFiling } from "../filing"
import { useConversationMessages } from "../messages"
import { useReferences } from "../references"
import { useSendMessage } from "../send"
import { ConversationTurns } from "../turns"

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

  return (
    <>
      <ConversationFiling
        conversationId={conversationId}
        live={live}
        organizationId={organizationId}
      />
      <ConversationTurns
        conversationId={conversationId}
        live={live}
        onOpenReference={onOpenReference}
        organizationId={organizationId}
        page={page}
        resolveReference={resolveReference}
        send={send}
      />
    </>
  )
}
