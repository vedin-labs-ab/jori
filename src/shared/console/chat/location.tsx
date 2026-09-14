import { Folder, FolderRoot, X } from "lucide-react"
import { type ReactNode, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FolderSelect } from "../folders/picker/select"
import { type FolderRow } from "../folders/types"
import { VisibilityLabel } from "../visibility/badge"

type LocationProps = {
  audience?: ReactNode
  disabled?: boolean
  folderId: string | null
  folderName?: string
  folders: FolderRow[] | undefined
  onChange: (folderId: string | null) => void
  saved?: boolean
}

/** Filing is conversation metadata; mentions belong to the editor below. */
export function ChatLocation({ audience, ...location }: LocationProps) {
  return (
    <div className="mx-2 flex min-w-0 items-center justify-between gap-2 rounded-t-md border border-b-0 bg-muted/40 px-1.5 py-1 text-xs">
      <FolderControl {...location} />
      <div className="flex shrink-0 items-center px-1">
        {audience ?? <VisibilityLabel visibility={{ mode: "private" }} />}
      </div>
    </div>
  )
}

/** The icon-sized clear button shares the trigger's visual area, but is a
 * sibling button so clearing never opens the picker or nests controls. */
function FolderControl({
  disabled = false,
  folderId,
  folderName,
  folders,
  onChange,
  saved = false,
}: Omit<LocationProps, "audience">) {
  const trigger = useRef<HTMLButtonElement>(null)
  const selected = folderId !== null
  const Icon = selected ? Folder : FolderRoot
  const name = selected
    ? (folders?.find((folder) => folder.folderId === folderId)?.name ??
      folderName ??
      (folders === undefined ? "Loading…" : "Unavailable folder"))
    : "Choose folder"
  const description = selected
    ? `${saved ? "Saved in" : "Save in"}: ${name}`
    : "Choose folder"

  return (
    <div className="group/location relative min-w-0 rounded-md transition-colors hover:bg-muted">
      <FolderSelect folders={folders} onChange={onChange} value={folderId}>
        <Button
          aria-label={description}
          className={cn(
            "max-w-full min-w-0 gap-2 px-2",
            !selected && "font-normal text-muted-foreground"
          )}
          disabled={disabled}
          ref={trigger}
          title={selected ? "Change folder" : "Choose where to save this chat"}
          type="button"
          variant="ghost"
        >
          <Icon
            className={cn(
              "size-3.5 shrink-0",
              selected && "group-hover/location:invisible"
            )}
          />
          <span className="truncate">{name}</span>
        </Button>
      </FolderSelect>
      {selected ? (
        <Button
          aria-label="Remove folder"
          className="invisible absolute top-0.5 left-1 size-6 rounded-sm text-muted-foreground group-hover/location:visible"
          disabled={disabled}
          onClick={() => {
            onChange(null)
            trigger.current?.focus()
          }}
          size="icon"
          title="Keep this chat outside any folder"
          type="button"
          variant="ghost"
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  )
}
