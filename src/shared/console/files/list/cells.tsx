import {
  MaterialNameCell,
  materialNameLinkClassName,
} from "@/shared/console/materials/cells/name"
import { VisibilityMark } from "@/shared/console/visibility/badge"
import { fileKind } from "@/shared/files/kind"
import { ConsoleLink } from "../../shell/link"
import { type FileRow } from "../types"

/** Name column: the registry icon, a link to the file, and a visibility
 *  badge for anything narrower or wider than the organization. */
export function FileNameCell({ file }: { file: FileRow }) {
  const kind = fileKind(file.mimeType, file.name)

  return (
    <MaterialNameCell icon={kind.icon}>
      <ConsoleLink
        className={materialNameLinkClassName}
        draggable={false}
        params={{ fileId: file.fileId }}
        title={file.name}
        to="/files/$fileId"
      >
        {file.name}
      </ConsoleLink>
      {file.visibility.mode === "organization" ? null : (
        <VisibilityMark visibility={file.visibility} />
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
