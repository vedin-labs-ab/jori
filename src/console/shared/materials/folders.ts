import { useQuery } from "convex/react"
import {
  Folder,
  FolderDot,
  FolderOpen,
  FolderOpenDot,
  FolderRoot,
} from "lucide-react"
import { api } from "../../../../convex/_generated/api"
import { type ListFacet } from "../list/controls"

/** The icon for a folder row anywhere folders show: a dot marks a folder
 *  holding anything — subfolders or filed resources — and an open body
 *  marks expansion, orthogonally. */
export function folderIcon(hasContents: boolean, isExpanded = false) {
  if (isExpanded) {
    return hasContents ? FolderOpenDot : FolderOpen
  }

  return hasContents ? FolderDot : Folder
}

/** What a list needs to know about a folder: its label, whether it holds
 *  anything — the same cue the sidebar tree's icons carry — and its parent,
 *  for telling identically named folders apart. */
export type FolderEntry = {
  hasContents: boolean
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
      icon: folderIcon(entry.hasContents),
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

/** Folder names by id for the whole organization, for resolving list rows'
 *  folderId into a linkable label. Convex dedupes the underlying tree
 *  subscription, so every list sharing it costs one query. */
export function useFolderNames(organizationId: string) {
  const tree = useQuery(api.folders.console.tree, { organizationId })

  if (tree?.status !== "ready") {
    return undefined
  }

  return new Map(
    tree.folders.map((folder) => [
      folder.folderId as string,
      {
        hasContents: folder.hasContents,
        name: folder.name,
        parentId: folder.parentId as string | undefined,
      },
    ])
  ) as FolderNames
}
