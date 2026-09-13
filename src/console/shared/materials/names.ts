import { useQuery } from "convex/react"
import { type FolderNames } from "@/shared/console/materials/folders"
import { api } from "../../../../convex/_generated/api"

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
        name: folder.name,
        parentId: folder.parentId as string | undefined,
      },
    ])
  ) as FolderNames
}
