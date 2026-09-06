import { type ReferenceTarget } from "@/shared/console/chat/types"
import { paneBodies } from "./bodies"

/** The pane's body for the active target, or nothing for a kind the pane
 *  does not show. Only the active tab's body mounts, so only its
 *  subscriptions are live. */
export function ConversationPaneBody({
  organizationId,
  target,
}: {
  organizationId: string
  target: ReferenceTarget
}) {
  const Body = paneBodies[target.kind]

  return Body === null ? null : (
    <Body id={target.id} organizationId={organizationId} />
  )
}
