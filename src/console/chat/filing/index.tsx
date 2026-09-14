import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useMemo, useState } from "react"
import { ChatLocation } from "@/shared/console/chat/location"
import { ChatTitleMenu } from "@/shared/console/chat/menu"
import { moveTarget, resourceSubject } from "@/shared/console/folders/types"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { VisibilityButton } from "@/shared/console/visibility/badge"
import { api } from "../../../../convex/_generated/api"
import { MoveResourceDialog } from "../../folders/move"
import { useMoveRun } from "../../folders/move/run"
import { type LiveConversation } from "../conversation"
import { ConversationVisibility } from "./access"

/** The same move flow as a drop, also reachable by keyboard or touch. */
export function ConversationFiling({
  conversationId,
  live,
  organizationId,
}: {
  conversationId: GenericId<"conversations">
  live: LiveConversation
  organizationId: string
}) {
  const { folder, target, tree, move } = useFiling(
    organizationId,
    conversationId,
    live
  )
  const [moving, setMoving] = useState(false)
  const [sharing, setSharing] = useState(false)

  useConversationTrail(
    live,
    folder,
    <ChatTitleMenu
      conversation={live}
      onAccess={() => setSharing(true)}
      onMoveToFolder={() => setMoving(true)}
      onUnfile={
        live.folderId === undefined
          ? undefined
          : () => {
              void move.run(resourceSubject([target]), null)
            }
      }
    />
  )

  return (
    <>
      <ChatLocation
        saved
        disabled={move.isBusy}
        folderId={live.folderId ?? null}
        folderName={folder?.folder?.name}
        folders={tree?.status === "ready" ? tree.folders : undefined}
        onChange={(folderId) => {
          if (folderId !== (live.folderId ?? null)) {
            void move.run(resourceSubject([target]), folderId)
          }
        }}
        audience={
          <VisibilityButton
            visibility={live.visibility}
            folderId={live.folderId}
            ownerId={live.createdBy}
            onClick={() => setSharing(true)}
          />
        }
      />
      <ConversationVisibility
        conversationId={conversationId}
        live={live}
        onClose={() => setSharing(false)}
        open={sharing}
        organizationId={organizationId}
      />
      <MoveResourceDialog
        onClose={() => setMoving(false)}
        organizationId={organizationId}
        resource={moving ? target : undefined}
      />
      {move.dialog}
    </>
  )
}

function useFiling(
  organizationId: string,
  conversationId: GenericId<"conversations">,
  live: LiveConversation
) {
  const move = useMoveRun(organizationId)
  const folder = useConversationFolder(organizationId, live.folderId)
  const tree = useQuery(api.folders.console.tree, { organizationId })
  const target = useMemo(
    () =>
      moveTarget("chat", conversationId, {
        name: live.title,
        folderId: live.folderId,
      }),
    [conversationId, live.title, live.folderId]
  )

  return { move, folder, tree, target }
}

function useConversationFolder(
  organizationId: string,
  folderId: GenericId<"folders"> | undefined
) {
  return useQuery(
    api.folders.console.get,
    folderId === undefined ? "skip" : { organizationId, folderId }
  )
}

function useConversationTrail(
  live: LiveConversation,
  folder: ReturnType<typeof useConversationFolder>,
  menu: ReactNode
) {
  useMaterialTrail(
    useMemo(
      () => ({
        name: live.title,
        trail: folder?.folder?.path.map((segment) => ({
          name: segment.name,
          to: "/folders/$folderId",
          params: { folderId: segment.folderId },
        })),
        menu,
      }),
      [live.title, folder, menu]
    )
  )
}
