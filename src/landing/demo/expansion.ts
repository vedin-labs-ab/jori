import { useState } from "react"
import { type FolderExpansion } from "@/shared/console/folders/expansion"
import {
  ancestorFolderIds,
  type FolderSummary,
} from "@/shared/console/folders/tree"

/** Which sidebar folders are open. The active folder's ancestors start
 *  open, decided before the first render rather than in an effect, so the
 *  server draws the tree the way the client will. */
export function useDemoExpansion(
  activeId: string | undefined,
  folders: readonly FolderSummary[]
): FolderExpansion {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        activeId === undefined ? [] : ancestorFolderIds(folders, activeId)
      )
  )

  return {
    expand: (folderId) =>
      setExpanded((current) =>
        current.has(folderId) ? current : new Set([...current, folderId])
      ),
    isExpanded: (folderId) => expanded.has(folderId),
    toggle: (folderId) =>
      setExpanded((current) => {
        const next = new Set(current)

        if (!next.delete(folderId)) {
          next.add(folderId)
        }

        return next
      }),
  }
}
