import { ChatDraftTurn } from "@/shared/console/chat/thread/draft"
import { liveDraft } from "../../state/chat"
import { type DemoState } from "../../state/types"

/** The reply being written to the conversation, out of the workspace, as
 *  the thread's tail shows it; nothing while no reply is on its way. */
export function DemoDraft({
  chat,
  conversationId,
}: {
  chat: DemoState["chat"]
  conversationId: string
}) {
  const draft = liveDraft(chat, conversationId)

  return draft === null ? null : <ChatDraftTurn draft={draft} />
}
