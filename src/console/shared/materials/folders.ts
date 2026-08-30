import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ListFacet } from "../list/controls"

export type FolderNames = ReadonlyMap<string, string>

const noFolder = ""

/** Folder facet for header-embedded list controls: every folder in the
 *  organization by name, plus the rows that live in no folder. */
export function folderFacet(
  folders: FolderNames | undefined
): ListFacet<{ folderId?: string }> {
  const named = [...(folders ?? [])]
    .map(([value, label]) => ({ label, value }))
    .sort((left, right) => left.label.localeCompare(right.label))

  return {
    label: "Folder",
    options: [...named, { label: "No folder", value: noFolder }],
    resolve: (row) => row.folderId ?? noFolder,
  }
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
    tree.folders.map((folder) => [folder.folderId as string, folder.name])
  ) as FolderNames
}
