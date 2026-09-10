import { useMemo, useState } from "react"
import { ChatTitleMenu } from "@/shared/console/chat/menu"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { chatMoveSubject } from "../../derive/chat"
import { folderDetail } from "../../derive/folders"
import { DemoMoveDialog } from "../../dialogs/move"
import { type DemoConversation } from "../../fixtures/chat"
import { useDemoWorkspace } from "../../workspace"

export function DemoChatFiling({
  conversation,
}: {
  conversation: DemoConversation
}) {
  const { actions, state } = useDemoWorkspace()
  const [moving, setMoving] = useState(false)

  useMaterialTrail(
    useMemo(() => {
      const folder =
        conversation.folderId === undefined
          ? undefined
          : folderDetail(state, conversation.folderId)

      return {
        name: conversation.title,
        trail: folder?.path.map((segment) => ({
          name: segment.name,
          to: "/folders/$folderId",
          params: { folderId: segment.folderId },
        })),
        menu: (
          <ChatTitleMenu
            onMove={() => setMoving(true)}
            onUnfile={
              conversation.folderId === undefined
                ? undefined
                : () => actions.fileResource("chat", conversation.id, null)
            }
          />
        ),
      }
    }, [actions, conversation, state])
  )

  return (
    <DemoMoveDialog
      onOpenChange={setMoving}
      subject={moving ? chatMoveSubject(conversation) : undefined}
    />
  )
}
