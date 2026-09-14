import { useMemo } from "react"
import { ChatLocation } from "@/shared/console/chat/location"
import { ChatTitleMenu } from "@/shared/console/chat/menu"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { VisibilityButton } from "@/shared/console/visibility/badge"
import { folderDetail } from "../../derive/folders"
import { useDemoChatMenu } from "../../dialogs/chat"
import { type DemoConversation } from "../../fixtures/chat"
import { ownerFields } from "../../fixtures/people"
import { type FolderId } from "../../fixtures/types"
import { useDemoFolders, useDemoWorkspace } from "../../workspace"

export function DemoChatFiling({
  conversation,
}: {
  conversation: DemoConversation
}) {
  const { actions, state } = useDemoWorkspace()
  const folders = useDemoFolders()
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
        menu: (
          <ChatTitleMenu
            conversation={{
              ...conversation,
              ...ownerFields(conversation.createdBy),
            }}
            {...items}
          />
        ),
      }
    }, [conversation, items, state])
  )

  return (
    <>
      <ChatLocation
        saved
        folderId={conversation.folderId ?? null}
        folders={folders}
        onChange={(folderId) =>
          actions.fileResource(
            "chat",
            conversation.id,
            folderId as FolderId | null
          )
        }
        audience={
          <VisibilityButton
            visibility={conversation.visibility}
            folderId={conversation.folderId}
            ownerId={conversation.createdBy}
            onClick={items.onAccess}
          />
        }
      />
      {dialogs}
    </>
  )
}
