import { useNavigate } from "@tanstack/react-router"
import { type FolderRow } from "./types"

/**
 * After a folder is deleted, its page has nothing left to show. The returned
 * handler leaves it for the parent's page (the console home for a root
 * folder) when the deleted folder is the one being viewed, and stays put
 * otherwise. Shared by the folder page and the sidebar tree, which can both
 * delete the folder on screen.
 */
export function useLeaveDeletedFolder(viewedFolderId: string | undefined) {
  const navigate = useNavigate()

  return (deleted: FolderRow) => {
    if (deleted.folderId !== viewedFolderId) {
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
