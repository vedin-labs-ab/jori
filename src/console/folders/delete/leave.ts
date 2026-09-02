import { useNavigate } from "@tanstack/react-router"
import { type ManagedFolder } from "@/shared/console/folders/types"

/**
 * After a folder is deleted, its page has nothing left to show — and neither
 * does any page below it, since deleting a folder takes its whole subtree.
 * The returned handler leaves for the deleted folder's parent (the console
 * home for a root folder) when the viewed folder is the deleted one or sits
 * inside it, and stays put otherwise. The trail is the viewed folder and its
 * ancestors, so one lookup answers both. Shared by the folder page and the
 * sidebar tree, which can both delete the folder on screen.
 */
export function useLeaveDeletedFolder(viewedTrail: readonly string[]) {
  const navigate = useNavigate()

  return (deleted: ManagedFolder) => {
    if (!viewedTrail.includes(deleted.folderId)) {
      return
    }

    if (deleted.parentId === undefined) {
      void navigate({ to: "/runs" })
    } else {
      void navigate({
        to: "/folders/$folderId",
        params: { folderId: deleted.parentId },
      })
    }
  }
}
