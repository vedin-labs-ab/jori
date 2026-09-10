import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useMemo, useState } from "react"
import { ChatTitleMenu } from "@/shared/console/chat/menu"
import { moveTarget, resourceSubject } from "@/shared/console/folders/types"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { VisibilityMark } from "@/shared/console/visibility/badge"
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
  const [moving, setMoving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const move = useMoveRun(organizationId)
  const folder = useConversationFolder(organizationId, live.folderId)
  const target = useMemo(
    () =>
      moveTarget("chat", conversationId, {
        name: live.title,
        folderId: live.folderId,
      }),
    [conversationId, live.title, live.folderId]
  )

  useMaterialTrail(
    useMemo(
      () => ({
        name: live.title,
        suffix: <VisibilityMark visibility={live.visibility} />,
        trail: folder?.folder?.path.map((segment) => ({
          name: segment.name,
          to: "/folders/$folderId",
          params: { folderId: segment.folderId },
        })),
        menu: (
          <ChatTitleMenu
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
        ),
      }),
      [folder, live.title, live.folderId, live.visibility, move.run, target]
    )
  )

  return (
    <>
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

function useConversationFolder(
  organizationId: string,
  folderId: GenericId<"folders"> | undefined
) {
  return useQuery(
    api.folders.console.get,
    folderId === undefined ? "skip" : { organizationId, folderId }
  )
}
