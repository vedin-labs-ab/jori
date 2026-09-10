import { useMemo, useState } from "react"
import { chatVisibilityHelp } from "@/shared/console/chat/access"
import { chatMoveSubject } from "../derive/chat"
import { type DemoConversation } from "../fixtures/chat"
import { useDemoWorkspace } from "../workspace"
import { DemoMoveDialog } from "./move"
import { DemoVisibilityDialog } from "./visibility"

/** The chat title and folder row open the same move and sharing dialogs. */
export function useDemoChatMenu(conversation: DemoConversation) {
  const { actions } = useDemoWorkspace()
  const [moving, setMoving] = useState(false)
  const [sharing, setSharing] = useState(false)

  const items = useMemo(
    () => ({
      onAccess: () => setSharing(true),
      onMoveToFolder: () => setMoving(true),
      onUnfile:
        conversation.folderId === undefined
          ? undefined
          : () => actions.fileResource("chat", conversation.id, null),
    }),
    [actions, conversation]
  )

  return {
    items,
    dialogs: (
      <>
        <DemoMoveDialog
          onOpenChange={setMoving}
          subject={moving ? chatMoveSubject(conversation) : undefined}
        />
        <DemoVisibilityDialog
          help={chatVisibilityHelp}
          noun="chat"
          onOpenChange={setSharing}
          open={sharing}
          target={{ kind: "chat", id: conversation.id }}
          value={conversation.visibility}
        />
      </>
    ),
  }
}
