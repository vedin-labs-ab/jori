import { useEffect, useState } from "react"
import { ancestorFolderIds, type FolderSummary } from "./tree"

export type FolderExpansion = {
  expand: (folderId: string) => void
  isExpanded: (folderId: string) => boolean
  toggle: (folderId: string) => void
}

// Expansion is session UI state that must outlive the sidebar: each page
// composes its own ConsolePage, so the shell remounts on every surface
// change, and the only stable ancestor is the app root, which serves public
// pages too and should not host console feature state. A module-scope set is
// the smallest thing that survives; each mount snapshots it into React state
// and every toggle writes through. Folder ids are globally unique, so
// entries left by other organizations are inert.
const sessionExpanded = new Set<string>()

/** Which sidebar folders are open, revealing the active folder's ancestors
 *  once the rows arrive so a deep link lands on a visible row. */
export function useFolderExpansion(
  activeId: string | undefined,
  folders: readonly FolderSummary[] | undefined
): FolderExpansion {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(sessionExpanded)
  )

  useEffect(() => {
    if (activeId === undefined || folders === undefined) {
      return
    }

    const ancestors = ancestorFolderIds(folders, activeId)

    if (ancestors.some((folderId) => !sessionExpanded.has(folderId))) {
      for (const folderId of ancestors) {
        sessionExpanded.add(folderId)
      }

      setExpanded(new Set(sessionExpanded))
    }
  }, [activeId, folders])

  return {
    // Expand-only, for actions that reveal (navigation clicks, deep
    // links); collapsing stays exclusively the chevron's toggle.
    expand: (folderId) => {
      if (!sessionExpanded.has(folderId)) {
        sessionExpanded.add(folderId)
        setExpanded(new Set(sessionExpanded))
      }
    },
    isExpanded: (folderId) => expanded.has(folderId),
    toggle: (folderId) => {
      if (sessionExpanded.has(folderId)) {
        sessionExpanded.delete(folderId)
      } else {
        sessionExpanded.add(folderId)
      }

      setExpanded(new Set(sessionExpanded))
    },
  }
}
