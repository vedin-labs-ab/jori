import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { ChatDraftTurn } from "@/shared/console/chat/thread/draft"
import { api } from "../../../convex/_generated/api"

/** The reply the conversation's run is writing, bound to Convex in the
 *  thread's tail alone: the draft lands every few hundred milliseconds
 *  while the run speaks, and only this turn re-renders for it. Mounted
 *  while the run is live, so the subscription ends with it. */
export function ConversationDraft({
  conversationId,
  organizationId,
}: {
  conversationId: GenericId<"conversations">
  organizationId: string
}) {
  const draft = useQuery(api.conversations.draft.get, {
    organizationId,
    conversationId,
  })

  return draft === undefined || draft === null ? null : (
    <ChatDraftTurn draft={draft} />
  )
}
