import { type VisibilityDirectory } from "./directory"

/** The folder chain may narrow a selected audience. This is display metadata, not an access decision. */
export function folderRestriction(
  folderId: string,
  directory: VisibilityDirectory
): string | null {
  const visited = new Set<string>()
  let current: string | undefined = folderId
  const names: string[] = []
  while (current !== undefined) {
    const folder = directory.folders?.find(
      (candidate) => candidate.folderId === current
    )
    if (folder === undefined || visited.has(current)) {
      return "Folder restrictions may further limit access. Open Audience to check who can see this item."
    }
    visited.add(current)
    if (folder.visibility.mode !== "organization") {
      names.push(folder.name)
    }
    current = folder.parentId
  }
  return names.length === 0
    ? null
    : `Folder restrictions also apply: ${names.map((name) => `"${name}"`).join(", ")}.`
}
