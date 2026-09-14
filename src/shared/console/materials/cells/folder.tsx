import { Folder, FolderLock, FolderRoot } from "lucide-react"
import { ConsoleLink } from "../../shell/link"
import { useVisibilityDirectory } from "../../visibility/directory"
import { folderRestriction } from "../../visibility/restriction"
import { type FolderNames, folderHint, folderPath } from "../folders"

/** Folder column: where the row's material is filed, linking to the folder.
 *  Parent paths distinguish repeated names and remain available on hover. */
export function MaterialFolderCell({
  folderId,
  folders,
}: {
  folderId: string | undefined
  folders: FolderNames | undefined
}) {
  const directory = useVisibilityDirectory()
  if (folderId === undefined) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <FolderRoot aria-hidden className="size-4 shrink-0" />
        <span>Unfiled</span>
      </span>
    )
  }

  if (folders === undefined) {
    return null
  }
  const name = folders.get(folderId)?.name
  if (name === undefined) {
    return <span className="text-muted-foreground">Unavailable folder</span>
  }
  const hint = folderHint(folders, folderId)
  const path = folderPath(folders, folderId)
  const label = hint === undefined ? name : `${hint} / ${name}`

  const restriction = folderRestriction(folderId, directory)
  const Icon = restriction === null ? Folder : FolderLock

  return (
    <ConsoleLink
      className="flex max-w-40 items-center gap-1.5 text-muted-foreground hover:text-foreground"
      params={{ folderId }}
      title={restriction === null ? path : `${path}. ${restriction}`}
      aria-description={restriction ?? undefined}
      to="/folders/$folderId"
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </ConsoleLink>
  )
}
