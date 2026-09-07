import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { type ReferenceTarget } from "@/shared/console/chat/types"
import { paneBodies } from "./bodies"

/** The pane's body for the active target. Only the active tab's body
 *  mounts, so only its subscriptions are live. */
export function ConversationPaneBody({
  onOpenReference,
  organizationId,
  target,
}: {
  onOpenReference: OpenTarget
  organizationId: string
  target: ReferenceTarget
}) {
  const Body = paneBodies[target.kind]

  return (
    <Body
      id={target.id}
      onOpenReference={onOpenReference}
      organizationId={organizationId}
    />
  )
}
