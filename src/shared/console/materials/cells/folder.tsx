import { Folder } from "lucide-react"
import { ConsoleLink } from "../../shell/link"
import { type FolderNames } from "../folders"

/** Folder column: where the row's material is filed, linking to the folder.
 *  Unfiled materials show a quiet dash; while names are still loading the
 *  cell stays empty rather than flashing a wrong state. */
export function MaterialFolderCell({
  folderId,
  folders,
}: {
  folderId: string | undefined
  folders: FolderNames | undefined
}) {
  if (folderId === undefined) {
    return <span className="text-muted-foreground">—</span>
  }

  const name = folders?.get(folderId)?.name

  if (name === undefined) {
    return null
  }

  return (
    <ConsoleLink
      className="flex max-w-40 items-center gap-1.5 text-muted-foreground hover:text-foreground"
      params={{ folderId }}
      title={name}
      to="/folders/$folderId"
    >
      <Folder aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{name}</span>
    </ConsoleLink>
  )
}
