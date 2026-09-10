import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useMemo, useState } from "react"
import { ChatTitleMenu } from "@/shared/console/chat/menu"
import { moveTarget, resourceSubject } from "@/shared/console/folders/types"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { api } from "../../../convex/_generated/api"
import { MoveResourceDialog } from "../folders/move"
import { useMoveRun } from "../folders/move/run"
import { type LiveConversation } from "./conversation"

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
  const move = useMoveRun(organizationId)
  const folder = useQuery(
    api.folders.console.get,
    live.folderId === undefined
      ? "skip"
      : {
          organizationId,
          folderId: live.folderId,
        }
  )
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
        trail: folder?.folder?.path.map((segment) => ({
          name: segment.name,
          to: "/folders/$folderId",
          params: { folderId: segment.folderId },
        })),
        menu: (
          <ChatTitleMenu
            onMove={() => setMoving(true)}
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
      [folder, live.title, live.folderId, move.run, target]
    )
  )

  return (
    <>
      <MoveResourceDialog
        onClose={() => setMoving(false)}
        organizationId={organizationId}
        resource={moving ? target : undefined}
      />
      {move.dialog}
    </>
  )
}
