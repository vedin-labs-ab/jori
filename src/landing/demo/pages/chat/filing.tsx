import { useMemo } from "react"
import { ChatTitleMenu } from "@/shared/console/chat/menu"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { folderDetail } from "../../derive/folders"
import { useDemoChatMenu } from "../../dialogs/chat"
import { type DemoConversation } from "../../fixtures/chat"
import { useDemoWorkspace } from "../../workspace"

export function DemoChatFiling({
  conversation,
}: {
  conversation: DemoConversation
}) {
  const { state } = useDemoWorkspace()
  const { dialogs, items } = useDemoChatMenu(conversation)

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
        menu: <ChatTitleMenu {...items} />,
      }
    }, [conversation, items, state])
  )

  return dialogs
}
