import { Link } from "@tanstack/react-router"
import { fileKind } from "@/shared/files/kind"
import {
  MaterialNameCell,
  materialNameLinkClassName,
} from "../shared/materials/cells/name"
import { MaterialOwnerCell } from "../shared/materials/cells/owner"
import { VisibilityBadge } from "../shared/visibility/badge"
import { type FileRow } from "./types"

/** Name column: the registry icon, a link to the file, and a visibility
 *  badge for anything narrower or wider than the organization. */
export function FileNameCell({ file }: { file: FileRow }) {
  const kind = fileKind(file.mimeType, file.name)

  return (
    <MaterialNameCell description={file.description} icon={kind.icon}>
      <Link
        className={materialNameLinkClassName}
        params={{ fileId: file.fileId }}
        title={file.name}
        to="/files/$fileId"
      >
        {file.name}
      </Link>
      {file.visibility.mode === "organization" ? null : (
        <VisibilityBadge visibility={file.visibility} />
      )}
    </MaterialNameCell>
  )
}

/** Type column: the registry icon and short label; the raw mime type stays
 *  reachable as the tooltip. */
export function FileTypeCell({ file }: { file: FileRow }) {
  const kind = fileKind(file.mimeType, file.name)

  return (
    <div
      className="flex items-center gap-1.5 text-muted-foreground"
      title={file.mimeType}
    >
      <kind.icon aria-hidden className="size-4 shrink-0" />
      {kind.label}
    </div>
  )
}

/** Owner column: the uploading person for uploads; Jori itself for files an
 *  agent run saved. */
export function FileOwnerCell({
  compact = false,
  file,
}: {
  compact?: boolean
  file: FileRow
}) {
  const owner =
    file.source === "run"
      ? ({ kind: "jori" } as const)
      : ({
          kind: "person",
          name: file.ownerName ?? "Member",
          image: file.ownerImage,
        } as const)

  return <MaterialOwnerCell compact={compact} owner={owner} />
}
