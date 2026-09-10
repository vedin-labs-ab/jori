import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { ChatVisibilityNotice } from "@/shared/console/chat/access"
import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { api } from "../../../../convex/_generated/api"
import { OrganizationVisibilityDialog } from "../../shared/visibility/dialog"
import { type LiveConversation } from "../conversation"

/** The title already has the live chat; a folder row resolves it on demand. */
export function ConversationVisibility({
  conversationId,
  live,
  onClose,
  open,
  organizationId,
}: {
  conversationId: GenericId<"conversations">
  live?: LiveConversation
  onClose: () => void
  open: boolean
  organizationId: string
}) {
  const result = useQuery(
    api.conversations.console.live,
    open && live === undefined ? { conversationId, organizationId } : "skip"
  )
  const conversation = useRetained(
    live ?? (result?.status === "ready" ? result : undefined)
  )

  if (conversation === undefined) {
    return null
  }

  return (
    <OrganizationVisibilityDialog
      noun="chat"
      notice={(draft) => (
        <ChatVisibilityNotice current={conversation.visibility} value={draft} />
      )}
      onOpenChange={closeOnDismiss(onClose)}
      open={open}
      organizationId={organizationId}
      ownerId={conversation.createdBy}
      target={{ kind: "chat", id: conversationId }}
      value={conversation.visibility}
    />
  )
}
