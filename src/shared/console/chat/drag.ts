import { emptyPayload } from "../folders/drag/plan"
import { useResourceRowDrag } from "../folders/drag/state"
import { type ChatConversation } from "./types"

/** Sidebar and recent links can coexist with the same chat in a folder. */
export function useChatDrag(
  chat: ChatConversation,
  zone: "sidebar" | "recent"
) {
  return useResourceRowDrag(
    { type: "chat", id: chat.id, name: chat.title, folderId: chat.folderId },
    emptyPayload,
    zone
  )
}
