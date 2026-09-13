import { Folder, FolderRoot } from "lucide-react"
import { type ListFacet } from "../list/controls"

/** Folder labels and parents, for telling identically named folders apart. */
type FolderEntry = {
  name: string
  parentId?: string
}

export type FolderNames = ReadonlyMap<string, FolderEntry>

const noFolder = ""

/** Folder facet for header-embedded list controls: the root — rows filed
 *  in no folder — leads, then every folder in the organization by name. */
export function folderFacet(
  folders: FolderNames | undefined
): ListFacet<{ folderId?: string }> {
  const map = folders ?? new Map<string, FolderEntry>()
  const named = [...map]
    .map(([value, entry]) => ({
      hint: duplicateHint(map, entry),
      icon: Folder,
      label: entry.name,
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label))

  return {
    label: "Folder",
    options: [
      { icon: FolderRoot, label: "No folder", value: noFolder },
      ...named,
    ],
    resolve: (row) => row.folderId ?? noFolder,
  }
}

/** Identically named folders read the same in a flat menu, so each gets
 *  its parent's name as a muted hint — Root for top-level ones. Uniquely
 *  named folders need none. */
function duplicateHint(
  folders: ReadonlyMap<string, FolderEntry>,
  entry: FolderEntry
) {
  let sameName = 0

  for (const other of folders.values()) {
    if (other.name === entry.name) {
      sameName += 1
    }
  }

  if (sameName < 2) {
    return undefined
  }

  return entry.parentId === undefined
    ? "Root"
    : (folders.get(entry.parentId)?.name ?? "Root")
}
