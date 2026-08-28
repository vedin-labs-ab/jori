import { Link } from "@tanstack/react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { fileKind } from "@/shared/files/kind"
import { MaterialScopeBadge } from "../shared/materials/scope"
import { type FileRow } from "./types"

/** Name column: the registry icon, a link to the file, and a scope badge
 *  for personal files. Organization files carry no badge. */
export function FileNameCell({ file }: { file: FileRow }) {
  const kind = fileKind(file.mimeType, file.name)

  return (
    <div className="grid gap-0.5">
      <div className="flex items-center gap-2">
        <kind.icon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <Link
          className="truncate font-medium hover:underline"
          params={{ fileId: file.fileId }}
          title={file.name}
          to="/files/$fileId"
        >
          {file.name}
        </Link>
        {file.scope === "personal" ? (
          <MaterialScopeBadge scope="personal" />
        ) : null}
      </div>
      {file.description === undefined ? null : (
        <p
          className="truncate pl-6 text-muted-foreground"
          title={file.description}
        >
          {file.description}
        </p>
      )}
    </div>
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
 *  agent run saved. `compact` slims the avatar and gap to the height of a
 *  detail-frame header row. */
export function FileOwnerCell({
  compact = false,
  file,
}: {
  compact?: boolean
  file: FileRow
}) {
  const rowClassName = cn(
    "flex min-w-0 items-center",
    compact ? "max-w-40 gap-1.5" : "gap-2"
  )

  if (file.source === "run") {
    return (
      <div className={rowClassName}>
        <BrandIcon className="size-5 shrink-0" />
        <span className="truncate">Jori</span>
      </div>
    )
  }

  const name = file.ownerName ?? "Member"

  return (
    <div className={rowClassName}>
      <Avatar
        className={compact ? "size-5" : undefined}
        size={compact ? "default" : "sm"}
      >
        <AvatarFallback className={compact ? "text-[9px]" : undefined}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => (word[0] ?? "").toUpperCase())
    .join("")
}
