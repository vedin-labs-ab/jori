import { memo } from "react"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { type ReferenceTarget, targetKey } from "@/shared/console/chat/types"
import { paneBodies } from "./bodies"

type PaneBodyProps = {
  onOpenReference: OpenTarget
  organizationId: string
  target: ReferenceTarget
}

/** The pane's body for the active target. Only the active tab's body
 *  mounts, so only its subscriptions are live. Memoized on the target's
 *  key: the pane hands it a fresh target object per render, and the same
 *  target is the same body. */
export const ConversationPaneBody = memo(function ConversationPaneBody({
  onOpenReference,
  organizationId,
  target,
}: PaneBodyProps) {
  const Body = paneBodies[target.kind]

  return (
    <Body
      id={target.id}
      onOpenReference={onOpenReference}
      organizationId={organizationId}
    />
  )
}, isSameBody)

function isSameBody(previous: PaneBodyProps, next: PaneBodyProps) {
  return (
    previous.organizationId === next.organizationId &&
    previous.onOpenReference === next.onOpenReference &&
    targetKey(previous.target) === targetKey(next.target)
  )
}
