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
      hint: folderHint(map, value),
      icon: Folder,
      label: entry.name,
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label))

  return {
    label: "Folder",
    options: [
      { icon: FolderRoot, label: "Unfiled", value: noFolder },
      ...named,
    ],
    resolve: (row) => row.folderId ?? noFolder,
  }
}

/** Full parent context is shared by the folder facet and its row links.
 * Missing ancestors and cycles stay explicit instead of looking like root. */
export function folderPath(folders: FolderNames, folderId: string): string {
  const names: string[] = []
  const visited = new Set<string>()
  let current: string | undefined = folderId
  while (current !== undefined) {
    const folder = folders.get(current)
    if (folder === undefined || visited.has(current)) {
      names.unshift("Unavailable folder")
      break
    }
    visited.add(current)
    names.unshift(folder.name)
    current = folder.parentId
  }
  return names.join(" / ")
}

/** Only repeated names need their parent path visible. */
export function folderHint(folders: FolderNames, folderId: string) {
  const entry = folders.get(folderId)
  if (entry === undefined) {
    return undefined
  }
  const duplicate = [...folders].some(
    ([id, other]) => id !== folderId && other.name === entry.name
  )
  if (!duplicate) {
    return undefined
  }
  return entry.parentId === undefined
    ? "Root"
    : folderPath(folders, entry.parentId)
}
