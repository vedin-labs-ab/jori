import { ChevronDown, Folder, X } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { FolderSelect } from "../folders/picker/select"
import { type FolderRow } from "../folders/types"
import { VisibilityLabel } from "../visibility/badge"

/** Filing is conversation metadata; mentions belong to the editor below. */
export function ChatLocation({
  audience,
  disabled = false,
  folderId,
  folderName,
  folders,
  onChange,
  saved = false,
}: {
  audience?: ReactNode
  disabled?: boolean
  folderId: string | null
  folderName?: string
  folders: FolderRow[] | undefined
  onChange: (folderId: string | null) => void
  saved?: boolean
}) {
  const name =
    folderId === null
      ? "No folder"
      : (folders?.find((folder) => folder.folderId === folderId)?.name ??
        folderName ??
        (folders === undefined ? "Loading…" : "Unavailable folder"))
  const label = saved ? "Saved in" : "Save in"
  return (
    <div className="mx-2 -mb-1 flex min-w-0 items-center justify-between gap-2 rounded-t-md border border-b-0 bg-muted/40 px-2 pt-1 pb-2 text-xs">
      <div className="flex min-w-0 items-center gap-1">
        <span className="shrink-0 text-muted-foreground">{label}</span>
        <FolderSelect folders={folders} onChange={onChange} value={folderId}>
          <Button
            aria-label={`${label}: ${name}`}
            className="min-w-0 shrink gap-1.5 px-1.5"
            disabled={disabled}
            title={name}
            type="button"
            variant="ghost"
          >
            <Folder className="size-3.5 shrink-0" />
            <span className="truncate">{name}</span>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </Button>
        </FolderSelect>
        {folderId === null ? null : (
          <Button
            aria-label="Remove folder"
            disabled={disabled}
            onClick={() => onChange(null)}
            size="icon"
            title="Save outside any folder"
            type="button"
            variant="ghost"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="flex shrink-0 items-center">
        {audience ?? <VisibilityLabel visibility={{ mode: "private" }} />}
      </div>
    </div>
  )
}
